import {
  buildAnalysisAuditChanges,
  buildProposalAuditChanges,
} from "@/lib/admin-audit-details";
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
    changes: buildAnalysisAuditChanges({
      title,
      orgao,
      objeto: input.objeto,
      numeroPregao: input.numeroPregao,
      processo: input.processo,
      analysisMode: input.analysisMode,
      documentNames: input.documentNames,
    }),
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
    await recordPriceHistoryFromItems(supabase, userId, pkg.itens, {
      orgao: pkg.metadata.orgao,
      numeroPregao: buildPregaoLine(pkg.metadata),
      proposalId: data.id,
      folderId: folder.id,
    });
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
      changes: buildProposalAuditChanges({
        pkg,
        companyId: input.companyId,
        grandTotal: payload.grand_total,
      }),
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
  await recordPriceHistoryFromItems(supabase, userId, pkg.itens, {
    orgao: pkg.metadata.orgao,
    numeroPregao: buildPregaoLine(pkg.metadata),
    proposalId: data.id,
    folderId: folder.id,
  });
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
    changes: buildProposalAuditChanges({
      pkg,
      companyId: input.companyId,
      grandTotal: payload.grand_total,
    }),
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
  options: {
    limit?: number;
    offset?: number;
    userId?: string;
    search?: string;
  } = {}
) {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  const search = options.search?.trim();
  if (search) {
    const term = `%${search.replace(/[%_,]/g, "")}%`;
    query = query.or(
      `user_email.ilike.${term},summary.ilike.${term},folder_title.ilike.${term}`
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    items: (data ?? []) as AdminAuditRow[],
    total: count ?? 0,
    limit,
    offset,
  };
}

export interface AdminDashboardStats {
  users_count: number;
  active_folders: number;
  archived_folders: number;
  audit_total: number;
  audit_today: number;
}

export async function getAdminDashboardStats(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  const { data, error } = await supabase.rpc("get_admin_dashboard_stats");
  if (error) {
    if (error.message.includes("get_admin_dashboard_stats")) {
      return getAdminDashboardStatsLegacy(supabase);
    }
    throw new Error(error.message);
  }

  const stats = (data ?? {}) as Partial<AdminDashboardStats>;
  return {
    users_count: Number(stats.users_count ?? 0),
    active_folders: Number(stats.active_folders ?? 0),
    archived_folders: Number(stats.archived_folders ?? 0),
    audit_total: Number(stats.audit_total ?? 0),
    audit_today: Number(stats.audit_today ?? 0),
  };
}

async function getAdminDashboardStatsLegacy(
  supabase: SupabaseClient
): Promise<AdminDashboardStats> {
  const [
    { count: usersCount },
    { count: activeFolders },
    { count: archivedFolders },
    { count: auditTotal },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("user_folders")
      .select("*", { count: "exact", head: true })
      .gt("expires_at", new Date().toISOString()),
    supabase
      .from("user_folders_archive")
      .select("*", { count: "exact", head: true }),
    supabase.from("admin_audit_log").select("*", { count: "exact", head: true }),
  ]);

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const { count: auditToday } = await supabase
    .from("admin_audit_log")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDay.toISOString());

  return {
    users_count: usersCount ?? 0,
    active_folders: activeFolders ?? 0,
    archived_folders: archivedFolders ?? 0,
    audit_total: auditTotal ?? 0,
    audit_today: auditToday ?? 0,
  };
}

export async function listAdminUsersSummary(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("get_admin_users_summary");
  if (error) {
    // Fallback se migration 007 ainda não rodou
    if (error.message.includes("get_admin_users_summary")) {
      return listAdminUsersSummaryLegacy(supabase);
    }
    throw new Error(error.message);
  }

  return (data ?? []) as Array<{
    id: string;
    full_name: string;
    email: string;
    created_at: string;
    folders_count: number;
    actions_count: number;
  }>;
}

async function listAdminUsersSummaryLegacy(supabase: SupabaseClient) {
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

export async function listAdminArchivedFolders(
  supabase: SupabaseClient,
  limit = 50,
  offset = 0
) {
  const { data, error, count } = await supabase
    .from("user_folders_archive")
    .select("id, title, orgao, numero_pregao, user_id, expires_at, updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw new Error(error.message);

  return {
    items: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  };
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

export async function getCachedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  contentHash: string,
  analysisMode: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("analysis_cache")
    .select("analysis_markdown")
    .eq("user_id", userId)
    .eq("content_hash", contentHash)
    .eq("analysis_mode", analysisMode)
    .maybeSingle();

  if (error || !data) return null;

  await supabase
    .from("analysis_cache")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("content_hash", contentHash)
    .eq("analysis_mode", analysisMode);

  return data.analysis_markdown as string;
}

export async function setCachedAnalysis(
  supabase: SupabaseClient,
  userId: string,
  input: {
    contentHash: string;
    analysisMode: string;
    analysisMarkdown: string;
    documentNames: string[];
  }
) {
  const { error } = await supabase.from("analysis_cache").upsert(
    {
      user_id: userId,
      content_hash: input.contentHash,
      analysis_mode: input.analysisMode,
      analysis_markdown: input.analysisMarkdown,
      document_names: input.documentNames,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,content_hash,analysis_mode" }
  );

  if (error) {
    console.error("analysis_cache upsert failed:", error.message);
  }
}

export async function logItemFieldEdit(
  supabase: SupabaseClient,
  userId: string,
  input: {
    userEmail?: string;
    folderId?: string | null;
    folderTitle?: string;
    proposalId?: string | null;
    itemNumero: string;
    itemTitulo: string;
    field: string;
    oldValue: string;
    newValue: string;
  }
) {
  if (input.oldValue === input.newValue) return;

  await logAdminAudit(supabase, {
    userId,
    userEmail: input.userEmail,
    folderId: input.folderId,
    folderTitle: input.folderTitle ?? "",
    action: "item_field_edited",
    entityType: "proposal_item",
    entityId: input.proposalId ?? undefined,
    summary: `Item ${input.itemNumero}: alterou ${input.field}`,
    changes: {
      item_numero: input.itemNumero,
      item_titulo: input.itemTitulo,
      field: input.field,
      de: input.oldValue,
      para: input.newValue,
    },
  });
}

export interface BrandProductSummary {
  titulo_produto: string;
  marca_modelo: string;
  codigo: string;
  unidade: string;
  sample_count: number;
  avg_price: number | null;
  last_price: number | null;
  last_orgao: string | null;
}

export interface ProductPriceStats {
  sample_count: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  last_price: number | null;
  last_orgao: string | null;
  last_pregao: string | null;
  last_used_at: string | null;
}

export async function recordPriceHistoryFromItems(
  supabase: SupabaseClient,
  userId: string,
  itens: ProposalItem[],
  meta: {
    orgao: string;
    numeroPregao: string;
    proposalId?: string;
    folderId?: string | null;
  }
) {
  const rows = itens
    .filter(
      (item) =>
        item.marcaModelo.trim() &&
        item.valorUnitario !== null &&
        Number.isFinite(item.valorUnitario) &&
        item.valorUnitario >= 0
    )
    .map((item) => ({
      user_id: userId,
      codigo: item.codigo.trim(),
      titulo_produto: item.tituloProduto || item.descricao.slice(0, 120),
      fabricante: item.fabricante.trim(),
      marca_modelo: item.marcaModelo.trim(),
      unidade: item.unidade || "UND",
      valor_unitario: item.valorUnitario,
      orgao: meta.orgao,
      numero_pregao: meta.numeroPregao,
      proposal_id: meta.proposalId ?? null,
      folder_id: meta.folderId ?? null,
    }));

  if (!rows.length) return;

  const { error } = await supabase.from("product_price_history").insert(rows);
  if (error) {
    console.error("product_price_history insert failed:", error.message);
  }
}

export async function listUserBrands(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [{ data: catalog }, { data: history }] = await Promise.all([
    supabase
      .from("product_catalog")
      .select("fabricante")
      .eq("user_id", userId)
      .not("fabricante", "is", null),
    supabase
      .from("product_price_history")
      .select("fabricante")
      .eq("user_id", userId)
      .not("fabricante", "is", null),
  ]);

  const brands = new Set<string>();
  for (const row of [...(catalog ?? []), ...(history ?? [])]) {
    const value = row.fabricante?.trim();
    if (value) brands.add(value);
  }

  return Array.from(brands).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export async function listProductsByBrand(
  supabase: SupabaseClient,
  userId: string,
  fabricante: string
): Promise<BrandProductSummary[]> {
  const brand = fabricante.trim();
  if (!brand) return [];

  const [{ data: history }, { data: catalog }] = await Promise.all([
    supabase
      .from("product_price_history")
      .select(
        "titulo_produto, marca_modelo, codigo, unidade, valor_unitario, orgao, created_at"
      )
      .eq("user_id", userId)
      .ilike("fabricante", brand)
      .order("created_at", { ascending: false }),
    supabase
      .from("product_catalog")
      .select(
        "titulo_produto, marca_modelo, codigo, unidade, valor_unitario_referencia, uso_count"
      )
      .eq("user_id", userId)
      .ilike("fabricante", brand),
  ]);

  const map = new Map<string, BrandProductSummary>();

  for (const row of history ?? []) {
    const marca = row.marca_modelo?.trim();
    if (!marca) continue;
    const key = `${marca}::${row.titulo_produto}`;
    const existing = map.get(key);
    const price = Number(row.valor_unitario);

    if (!existing) {
      map.set(key, {
        titulo_produto: row.titulo_produto,
        marca_modelo: marca,
        codigo: row.codigo ?? "",
        unidade: row.unidade ?? "UND",
        sample_count: 1,
        avg_price: price,
        last_price: price,
        last_orgao: row.orgao ?? null,
      });
      continue;
    }

    existing.sample_count += 1;
    const total = (existing.avg_price ?? 0) * (existing.sample_count - 1) + price;
    existing.avg_price = Math.round((total / existing.sample_count) * 100) / 100;
  }

  for (const row of catalog ?? []) {
    const marca = row.marca_modelo?.trim();
    if (!marca) continue;
    const key = `${marca}::${row.titulo_produto}`;
    if (map.has(key)) continue;

    map.set(key, {
      titulo_produto: row.titulo_produto,
      marca_modelo: marca,
      codigo: row.codigo ?? "",
      unidade: row.unidade ?? "UND",
      sample_count: row.uso_count ?? 0,
      avg_price: row.valor_unitario_referencia,
      last_price: row.valor_unitario_referencia,
      last_orgao: null,
    });
  }

  return Array.from(map.values()).sort(
    (a, b) => b.sample_count - a.sample_count
  );
}

export async function getProductPriceStats(
  supabase: SupabaseClient,
  userId: string,
  fabricante: string,
  marcaModelo: string
): Promise<ProductPriceStats | null> {
  const { data, error } = await supabase.rpc("get_product_price_stats", {
    p_user_id: userId,
    p_fabricante: fabricante.trim(),
    p_marca_modelo: marcaModelo.trim(),
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.sample_count) return null;

  return {
    sample_count: Number(row.sample_count),
    avg_price: row.avg_price !== null ? Number(row.avg_price) : null,
    min_price: row.min_price !== null ? Number(row.min_price) : null,
    max_price: row.max_price !== null ? Number(row.max_price) : null,
    last_price: row.last_price !== null ? Number(row.last_price) : null,
    last_orgao: row.last_orgao ?? null,
    last_pregao: row.last_pregao ?? null,
    last_used_at: row.last_used_at ?? null,
  };
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
