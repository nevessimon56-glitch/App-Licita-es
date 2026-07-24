import type { AnalysisMode, AnalysisResponse } from "@/lib/analysis-prompt";

export interface RestoredAnalysisRecord {
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
}

export function buildAnalysisResponseFromHistory(
  saved: RestoredAnalysisRecord
): AnalysisResponse {
  return {
    analysis: saved.analysis_markdown,
    mode: (saved.analysis_mode as AnalysisMode) || "completo",
    documentSummary: saved.document_names.map((name) => ({
      name,
      type: "outro",
      pageCount: 0,
      charCount: 0,
    })),
    documents: saved.document_names.map((name) => ({
      name,
      type: "outro",
      text: "",
      pageCount: 0,
    })),
    model: "histórico salvo",
    generatedAt: saved.updated_at,
  };
}
