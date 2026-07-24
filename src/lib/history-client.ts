import type { ProposalItem, ProposalPackage } from "@/lib/proposal-types";

export interface SavedAnalysisSummary {
  id: string;
  title: string;
  orgao: string;
  created_at: string;
}

export interface SavedProposalSummary {
  id: string;
  title: string;
  orgao: string;
  numero_pregao: string;
  grand_total: number | null;
  company_id: string;
  updated_at: string;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Erro na requisição.");
  }
  return data;
}

export async function saveAnalysisToHistory(input: {
  analysisMarkdown: string;
  analysisMode: string;
  documentNames: string[];
  title?: string;
  folderId?: string | null;
}) {
  const response = await fetch("/api/history/analyses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ analysis: SavedAnalysisSummary }>(response);
}

export async function listAnalysesHistory() {
  const response = await fetch("/api/history/analyses");
  return parseJsonResponse<{ analyses: SavedAnalysisSummary[] }>(response);
}

export async function loadAnalysisFromHistory(analysisId: string) {
  const response = await fetch(`/api/history/analyses/${analysisId}`);
  return parseJsonResponse<{
    analysis: {
      id: string;
      folder_id: string | null;
      analysis_markdown: string;
      analysis_mode: string;
      document_names: string[];
      title: string;
      orgao: string;
      numero_pregao: string;
      processo: string;
      updated_at: string;
    };
  }>(response);
}

export async function listFoldersHistory() {
  const response = await fetch("/api/history/folders");
  return parseJsonResponse<{
    folders: Array<{
      id: string;
      title: string;
      orgao: string;
      numero_pregao: string;
      expires_at: string;
      updated_at: string;
      analyses_count: number;
      proposals_count: number;
    }>;
  }>(response);
}

export async function saveProposalToHistory(input: {
  pkg: ProposalPackage;
  companyId: string;
  analysisId?: string | null;
  proposalId?: string;
  folderId?: string | null;
}) {
  const isUpdate = Boolean(input.proposalId);
  const response = await fetch("/api/history/proposals", {
    method: isUpdate ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  return parseJsonResponse<{ proposal: { id: string } }>(response);
}

export async function loadProposalFromHistory(proposalId: string) {
  const response = await fetch(`/api/history/proposals/${proposalId}`);
  return parseJsonResponse<{
    proposal: {
      package_data: ProposalPackage;
      company_id: string;
      folder_id: string | null;
    };
  }>(response);
}

export async function applyCatalogToItems(itens: ProposalItem[]) {
  const response = await fetch("/api/products/apply-catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itens }),
  });

  return parseJsonResponse<{ itens: ProposalItem[] }>(response);
}
