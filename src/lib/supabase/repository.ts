import type { ProposalItem, ProposalPackage } from "@/lib/proposal-types";
import { getProposalGrandTotal } from "@/lib/proposal-layout";
import { buildPregaoLine } from "@/lib/proposal-metadata";
import type { SupabaseClient } from "@supabase/supabase-js";

const RETENTION_DAYS = 30;

export interface SavedFolderRow {
  id: string;
  title: string;
  orgao: string;
  numero_pregao: string;
  processo: string;
  objeto: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface SavedAnalysisRow {
  id: string;
  folder_id: string | null;
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
  folder_id: string | null;
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

export interface AdminAuditRow {
  id: string;
  user_id: string | null;
  user_email: string;
  folder_id: string | null;
  folder_title: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface FolderListItem extends SavedFolderRow {
  analyses_count: number;
  proposals_count: number;
}

function buildFolderTitle(orgao: string, numeroPregao: string, processo: string) {
  const org = orgao.trim() || "Sem órgão";
  if (numeroPregao.trim()) {
    return `${org} — PE ${numeroPregao.trim()}`;
  }
  if (processo.trim()) {
    return `${org} — Proc. ${processo.trim()}`;
  }
  return org;
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

function expiresAtFromNow(): string {
  const date = new Date();
  date.setDate(date.getDate() + RETENTION_DAYS);
  return date.toISOString();
}

function isFolderActive(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() > Date.now();
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

export async function logAdminAudit(
  supabase: SupabaseClient,
  input: {
    userId: string;
    userEmail?: string;
    folderId?: string | null;
    folderTitle?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    summary?: string;
    changes?: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from("admin_audit_log").insert({
    user_id: input.userId,
    user_email: input.userEmail ?? "",
    folder_id: input.folderId ?? null,
    folder_title: input.folderTitle ?? "",
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    summary: input.summary ?? "",
    changes: input.changes ?? {},
  });

  if (error) {
    console.error("admin_audit_log insert failed:", error.message);
  }
}

export async function upsertFolderForUser(
  supabase: SupabaseClient,
  userId: string,
  input: {
    orgao?: string;
    numeroPregao?: string;
    processo?: string;
    objeto?: string;
    folderId?: string | null;
  }
): Promise<SavedFolderRow> {
  if (input.folderId) {
    const { data, error } = await supabase
      .from("user_folders")
      .update({
        updated_at: new Date().toISOString(),
        expires_at: expiresAtFromNow(),
      })
      .eq("id", input.folderId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SavedFolderRow;
  }

  const orgao = input.orgao?.trim() ?? "";
  const numeroPregao = input.numeroPregao?.trim() ?? "";
  const processo = input.processo?.trim() ?? "";
  const objeto = input.objeto?.trim() ?? "";
  const title = buildFolderTitle(orgao, numeroPregao, processo);

  if (orgao || numeroPregao || processo) {
    let query = supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false })
      .limit(1);

    if (numeroPregao) {
      query = query.eq("numero_pregao", numeroPregao);
    }
    if (orgao) {
      query = query.ilike("orgao", orgao);
    }

    const { data: existing } = await query.maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("user_folders")
        .update({
          title,
          orgao,
          numero_pregao: numeroPregao,
          processo,
          objeto: objeto || existing.objeto,
          expires_at: expiresAtFromNow(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as SavedFolderRow;
    }
  }

  const { data, error } = await supabase
    .from("user_folders")
    .insert({
      user_id: userId,
      title,
      orgao,
      numero_pregao: numeroPregao,
      processo,
      objeto,
      expires_at: expiresAtFromNow(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as SavedFolderRow;
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
    folderId?: string | null;
    userEmail?: string;
  }
): Promise<SavedAnalysisRow> {
  const orgao = input.orgao?.trim() || extractOrgaoFromAnalysis(input.analysisMarkdown);
  const title = input.title?.trim() || orgao || "Análise sem título";

  const folder = await upsertFolderForUser(supabase, userId, {
    orgao,
    numeroPregao: input.numeroPregao,
    processo: input.processo,
    objeto: input.objeto,
    folderId: input.folderId,
  });

  const { data, error } = await supabase
    .from("user_analyses")
    .insert({
      user_id: userId,
      folder_id: folder.id,
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

  await logUserActivity(supabase, userId, "analysis_saved", "analysis", data.id, {
    folder_id: folder.id,
  });

  await logAdminAudit(supabase, {
    userId,
    userEmail: input.userEmail,
    folderId: folder.id,
    folderTitle: folder.title,
    action: "analysis_saved",
    entityType: "analysis",
    entityId: data.id,
    summary: `Salvou análise: ${title}`,
    changes: {
      analysis_mode: input.analysisMode,
      document_count: input.documentNames.length,
    },
  });

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
    folderId?: string | null;
    userEmail?: string;
  }
): Promise<SavedProposalRow> {
  const pkg = input.pkg;
  const folder = await upsertFolderForUser(supabase, userId, {
    orgao: pkg.metadata.orgao,
    numeroPregao: buildPregaoLine(pkg.metadata),
    processo: pkg.metadata.processo,
    objeto: pkg.metadata.objeto,
    folderId: input.folderId,
  });

  const payload = {
    user_id: userId,
    folder_id: folder.id,
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

  const isUpdate = Boolean(input.proposalId);

  if (isUpdate) {
    const { data, error } = await supabase
      .from("user_proposals")
      .update(payload)
      .eq("id", input.proposalId!)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    await syncProductsFromProposal(supabase, userId, pkg.itens);
    await logUserActivity(supabase, userId, "proposal_updated", "proposal", data.id);

    await logAdminAudit(supabase, {
      userId,
      userEmail: input.userEmail,
      folderId: folder.id,
      folderTitle: folder.title,
      action: "proposal_updated",
      entityType: "proposal",
      entityId: data.id,
      summary: `Atualizou proposta: ${payload.title}`,
      changes: {
        company_id: input.companyId,
        items_count: pkg.itens.length,
        grand_total: payload.grand_total,
      },
    });

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

  await logAdminAudit(supabase, {
    userId,
    userEmail: input.userEmail,
    folderId: folder.id,
    folderTitle: folder.title,
    action: "proposal_saved",
    entityType: "proposal",
    entityId: data.id,
    summary: `Salvou proposta: ${payload.title}`,
    changes: {
      company_id: input.companyId,
      items_count: pkg.itens.length,
      grand_total: payload.grand_total,
    },
  });

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

export async function listActiveFolders(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
): Promise<FolderListItem[]> {
  const { data: folders, error } = await supabase
    .from("user_folders")
    .select("*")
    .eq("user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!folders?.length) return [];

  const folderIds = folders.map((folder) => folder.id);

  const [{ data: analyses }, { data: proposals }] = await Promise.all([
    supabase
      .from("user_analyses")
      .select("folder_id")
      .in("folder_id", folderIds),
    supabase
      .from("user_proposals")
      .select("folder_id")
      .in("folder_id", folderIds),
  ]);

  const analysisCounts = new Map<string, number>();
  const proposalCounts = new Map<string, number>();

  for (const row of analyses ?? []) {
    if (!row.folder_id) continue;
    analysisCounts.set(row.folder_id, (analysisCounts.get(row.folder_id) ?? 0) + 1);
  }

  for (const row of proposals ?? []) {
    if (!row.folder_id) continue;
    proposalCounts.set(row.folder_id, (proposalCounts.get(row.folder_id) ?? 0) + 1);
  }

  return folders.map((folder) => ({
    ...(folder as SavedFolderRow),
    analyses_count: analysisCounts.get(folder.id) ?? 0,
    proposals_count: proposalCounts.get(folder.id) ?? 0,
  }));
}

export async function listRecentAnalyses(
  supabase: SupabaseClient,
  userId: string,
  limit = 30
) {
  const { data, error } = await supabase
    .from("user_analyses")
    .select(
      "id, folder_id, title, orgao, objeto, numero_pregao, processo, analysis_mode, created_at, updated_at, user_folders(expires_at)"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).filter((row) => {
    const folder = row.user_folders as { expires_at?: string } | null;
    if (!row.folder_id) return true;
    return isFolderActive(folder?.expires_at);
  });
}

export async function getAnalysisById(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
) {
  const { data, error } = await supabase
    .from("user_analyses")
    .select("*, user_folders(expires_at)")
    .eq("id", analysisId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);

  const folder = data.user_folders as { expires_at?: string } | null;
  if (data.folder_id && !isFolderActive(folder?.expires_at)) {
    throw new Error("Esta análise expirou (retenção de 30 dias).");
  }

  return data as SavedAnalysisRow;
}

export async function listRecentProposals(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
) {
  const { data, error } = await supabase
    .from("user_proposals")
    .select(
      "id, folder_id, title, orgao, objeto, numero_pregao, processo, company_id, grand_total, created_at, updated_at, user_folders(expires_at)"
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).filter((row) => {
    const folder = row.user_folders as { expires_at?: string } | null;
    if (!row.folder_id) return true;
    return isFolderActive(folder?.expires_at);
  });
}

export async function getProposalById(
  supabase: SupabaseClient,
  userId: string,
  proposalId: string
) {
  const { data, error } = await supabase
    .from("user_proposals")
    .select("*, user_folders(expires_at)")
    .eq("id", proposalId)
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);

  const folder = data.user_folders as { expires_at?: string } | null;
  if (data.folder_id && !isFolderActive(folder?.expires_at)) {
    throw new Error("Esta proposta expirou (retenção de 30 dias).");
  }

  return data as SavedProposalRow;
}

export async function listAdminAuditLog(
  supabase: SupabaseClient,
  limit = 100,
  userId?: string
) {
  let query = supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminAuditRow[];
}

export async function listAdminUsersSummary(supabase: SupabaseClient) {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const [{ data: folders }, { data: audit }] = await Promise.all([
    supabase.from("user_folders").select("user_id"),
    supabase.from("admin_audit_log").select("user_id"),
  ]);

  const folderCounts = new Map<string, number>();
  const auditCounts = new Map<string, number>();

  for (const row of folders ?? []) {
    folderCounts.set(row.user_id, (folderCounts.get(row.user_id) ?? 0) + 1);
  }

  for (const row of audit ?? []) {
    if (!row.user_id) continue;
    auditCounts.set(row.user_id, (auditCounts.get(row.user_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((profile) => ({
    ...profile,
    folders_count: folderCounts.get(profile.id) ?? 0,
    actions_count: auditCounts.get(profile.id) ?? 0,
  }));
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
        null &&
      Number.isFinite(item.valorUnitario ?? catalog.valor_unitario_referencia)
        ? item.quantidade *
          (item.valorUnitario ?? catalog.valor_unitario_referencia ?? 0)
        : item.valorTotal,
  };
}
