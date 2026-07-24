"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, RefreshCw } from "lucide-react";
import { loadAnalysisFromHistory } from "@/lib/history-client";

interface AnalysisSummary {
  id: string;
  folder_id: string | null;
  title: string;
  orgao: string;
  numero_pregao: string;
  analysis_mode: string;
  created_at: string;
}

interface LoadedAnalysis {
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

interface Props {
  supabaseEnabled: boolean;
  folderId?: string | null;
  refreshKey?: number;
  onLoadAnalysis: (analysis: LoadedAnalysis) => void;
}

export function AnalysisHistoryPanel({
  supabaseEnabled,
  folderId = null,
  refreshKey = 0,
  onLoadAnalysis,
}: Props) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!supabaseEnabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/history/analyses");
      const data = (await response.json()) as {
        analyses?: AnalysisSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar histórico.");
      }

      let items = data.analyses ?? [];
      if (folderId) {
        items = items.filter((item) => item.folder_id === folderId);
      }
      setAnalyses(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [supabaseEnabled, folderId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  async function handleOpen(analysisId: string) {
    setLoading(true);
    setError(null);

    try {
      const data = await loadAnalysisFromHistory(analysisId);
      onLoadAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir análise.");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseEnabled) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-700" />
            Histórico de análises
          </h3>
          <p className="text-sm text-slate-600">
            Reabra um resumo salvo sem analisar o PDF de novo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Atualizar
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!analyses.length && !loading ? (
        <p className="text-sm text-slate-500">
          Nenhuma análise salva. Clique em <strong>Salvar no histórico</strong> no
          resumo.
        </p>
      ) : null}

      <div className="space-y-3">
        {analyses.map((analysis) => (
          <button
            key={analysis.id}
            type="button"
            onClick={() => void handleOpen(analysis.id)}
            className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
          >
            <p className="font-medium text-slate-800">{analysis.title}</p>
            <p className="text-sm text-slate-600 mt-1">
              {analysis.orgao}
              {analysis.numero_pregao ? ` — PE ${analysis.numero_pregao}` : ""}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {new Date(analysis.created_at).toLocaleString("pt-BR")} ·{" "}
              {analysis.analysis_mode}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
