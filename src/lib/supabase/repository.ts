import type { ProposalItem, ProposalPackage } from "@/lib/proposal-types";
import { getProposalGrandTotal } from "@/lib/proposal-layout";
import { buildPregaoLine } from "@/lib/proposal-metadata";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SavedAnalysisRow {
  id: string;
  title: string;
  orgao: string;
  objeto: string;
  numero_pregao: string;
  processo: string;
  analysis_mode: string;
  analysis_markdown: string;
  document_names: string[];
  created_at: string;
  updated_at: string;
}

export interface SavedProposalRow {
  id: string;
  analysis_id: string | null;
  company_id: string;
  title: string;
  orgao: string;
  objeto: string;
  numero_pregao: string;
  processo: string;
  package_data: ProposalPackage;
  grand_total: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCatalogRow {
  id: string;
  codigo: string;
  titulo_produto: string;
  descricao: string;
  unidade: string;
  fabricante: string;
  marca_modelo: string;
  sem_instalacao: boolean;
  valor_unitario_referencia: number | null;
  uso_count: number;
  last_used_at: string | null;
}

function buildProposalTitle(pkg: ProposalPackage): string {
  const orgao = pkg.metadata.orgao.trim() || "Sem órgão";
  const pregao = buildPregaoLine(pkg.metadata);
  return pregao ? `${orgao} — PE ${pregao}` : orgao;
}

function extractOrgaoFromAnalysis(markdown: string): string {
  const match = markdown.match(/^##\s+(.+)$/m);
  return match?.[1]?.trim() ?? "";
}

export async function logUserActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details: Record<string, unknown> = {}
) {
  await supabase.from("user_activity_log").insert({
    user_id: userId,
    action,
    entity_type: entityType ?? null,
    entity_id: entityId ?? null,
    details,
  });
}

export async function saveAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title?: string;
    analysisMarkdown: string;
    analysisMode: string;
    documentNames: string[];
    orgao?: string;
    objeto?: string;
    numeroPregao?: string;
    processo?: string;
  }
): Promise<SavedAnalysisRow> {
  const orgao = input.orgao?.trim() || extractOrgaoFromAnalysis(input.analysisMarkdown);
  const title = input.title?.trim() || orgao || "Análise sem título";

  const { data, error } = await supabase
    .from("user_analyses")
    .insert({
      user_id: userId,
      title,
      orgao,
      objeto: input.objeto ?? "",
      numero_pregao: input.numeroPregao ?? "",
      processo: input.processo ?? "",
      analysis_mode: input.analysisMode,
      analysis_markdown: input.analysisMarkdown,
      document_names: input.documentNames,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await logUserActivity(supabase, userId, "analysis_saved", "analysis", data.id);
  return data as SavedAnalysisRow;
}

export async function saveProposal(
  supabase: SupabaseClient,
  userId: string,
  input: {
    analysisId?: string | null;
    companyId: string;
    pkg: ProposalPackage;
    proposalId?: string;
  }
): Promise<SavedProposalRow> {
  const pkg = input.pkg;
  const payload = {
    user_id: userId,
    analysis_id: input.analysisId ?? null,
    company_id: input.companyId,
    title: buildProposalTitle(pkg),
    orgao: pkg.metadata.orgao,
    objeto: pkg.metadata.objeto,
    numero_pregao: buildPregaoLine(pkg.metadata),
    processo: pkg.metadata.processo,
    package_data: pkg,
    grand_total: getProposalGrandTotal(pkg),
  };

  if (input.proposalId) {
    const { data, error } = await supabase
      .from("user_proposals")
      .update(payload)
      .eq("id", input.proposalId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await syncProductsFromProposal(supabase, userId, pkg.itens);
    await logUserActivity(supabase, userId, "proposal_updated", "proposal", data.id);
    return data as SavedProposalRow;
  }

  const { data, error } = await supabase
    .from("user_proposals")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await syncProductsFromProposal(supabase, userId, pkg.itens);
  await logUserActivity(supabase, userId, "proposal_saved", "proposal", data.id);
  return data as SavedProposalRow;
}

export async function syncProductsFromProposal(
  supabase: SupabaseClient,
  userId: string,
  itens: ProposalItem[]
) {
  for (const item of itens) {
    const hasBrandData =
      item.fabricante.trim() ||
      item.marcaModelo.trim() ||
      item.valorUnitario !== null;

    if (!hasBrandData && !item.codigo.trim()) continue;

    await supabase.rpc("upsert_product_from_item", {
      p_user_id: userId,
      p_codigo: item.codigo,
      p_titulo_produto: item.tituloProduto || item.descricao.slice(0, 120),
      p_descricao: item.descricao,
      p_unidade: item.unidade,
      p_fabricante: item.fabricante,
      p_marca_modelo: item.marcaModelo,
      p_sem_instalacao: item.semInstalacao,
      p_valor_unitario: item.valorUnitario,
    });
  }
}

export async function listRecentProposals(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("user_proposals")
    .select(
      "id, title, orgao, objeto, numero_pregao, processo, company_id, grand_total, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProposalById(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
) {
  const { data, error } = await supabase
    .from("user_proposals")
    .select("*")
    .eq("id", proposalId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data as SavedProposalRow;
}

export async function listProductCatalog(
  supabase: SupabaseClient,
  userId: string,
  query = ""
) {
  let request = supabase
    .from("product_catalog")
    .select(
      "id, codigo, titulo_produto, descricao, unidade, fabricante, marca_modelo, sem_instalacao, valor_unitario_referencia, uso_count, last_used_at"
    )
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(100);

  const q = query.trim();
  if (q) {
    request = request.or(
      `codigo.ilike.%${q}%,titulo_produto.ilike.%${q}%,descricao.ilike.%${q}%,marca_modelo.ilike.%${q}%`
    );
  }

  const { data, error } = await request;
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductCatalogRow[];
}

export async function findCatalogMatches(
  supabase: SupabaseClient,
  userId: string,
  item: ProposalItem
): Promise<ProductCatalogRow | null> {
  const codigo = item.codigo.trim();
  if (codigo) {
    const { data } = await supabase
      .from("product_catalog")
      .select(
        "id, codigo, titulo_produto, descricao, unidade, fabricante, marca_modelo, sem_instalacao, valor_unitario_referencia, uso_count, last_used_at"
      )
      .eq("user_id", userId)
      .eq("codigo", codigo.toUpperCase())
      .maybeSingle();

    if (data) return data as ProductCatalogRow;
  }

  const titulo = (item.tituloProduto || item.descricao).trim();
  if (!titulo) return null;

  const { data } = await supabase
    .from("product_catalog")
    .select(
      "id, codigo, titulo_produto, descricao, unidade, fabricante, marca_modelo, sem_instalacao, valor_unitario_referencia, uso_count, last_used_at"
    )
    .eq("user_id", userId)
    .ilike("titulo_produto", titulo)
    .order("uso_count", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as ProductCatalogRow | null) ?? null;
}

export function applyCatalogToItem(
  item: ProposalItem,
  catalog: ProductCatalogRow
): ProposalItem {
  return {
    ...item,
    unidade: catalog.unidade || item.unidade,
    fabricante: catalog.fabricante || item.fabricante,
    marcaModelo: catalog.marca_modelo || item.marcaModelo,
    semInstalacao: catalog.sem_instalacao,
    valorUnitario:
      item.valorUnitario ?? catalog.valor_unitario_referencia ?? null,
    valorTotal:
      (item.valorUnitario ?? catalog.valor_unitario_referencia ?? null) !==
        null && Number.isFinite(item.valorUnitario ?? catalog.valor_unitario_referencia)
        ? item.quantidade * (item.valorUnitario ?? catalog.valor_unitario_referencia ?? 0)
        : item.valorTotal,
  };
}
