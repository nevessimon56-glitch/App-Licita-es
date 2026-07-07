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

export async function saveProposalToHistory(input: {
  pkg: ProposalPackage;
  companyId: string;
  analysisId?: string | null;
  proposalId?: string;
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
    proposal: { package_data: ProposalPackage; company_id: string };
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
