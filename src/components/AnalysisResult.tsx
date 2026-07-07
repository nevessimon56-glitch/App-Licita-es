"use client";

import { FileText, Clock, Cpu, Layers, Loader2, Save } from "lucide-react";
import { useState } from "react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { MODE_LABELS } from "@/lib/analysis-prompt";
import { saveAnalysisToHistory } from "@/lib/history-client";
import { ExportButtons } from "./ExportButtons";
import { EditableDocumentView } from "./EditableDocumentView";

interface Props {
  result: AnalysisResponse;
  onAnalysisChange: (analysis: string) => void;
  supabaseEnabled?: boolean;
  savedAnalysisId?: string | null;
  onAnalysisSaved?: (analysisId: string) => void;
}

export function AnalysisResult({
  result,
  onAnalysisChange,
  supabaseEnabled = false,
  savedAnalysisId = null,
  onAnalysisSaved,
}: Props) {
  const generatedDate = new Date(result.generatedAt).toLocaleString("pt-BR");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSaveAnalysis() {
    if (!supabaseEnabled) return;

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const { analysis } = await saveAnalysisToHistory({
        analysisMarkdown: result.analysis,
        analysisMode: result.mode,
        documentNames: result.documentSummary.map((doc) => doc.name),
      });
      onAnalysisSaved?.(analysis.id);
      setSaveMessage("Análise salva no histórico.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erro ao salvar análise."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Resumo gerado</h2>
          <div className="flex flex-wrap items-center gap-2">
            {supabaseEnabled ? (
              <button
                type="button"
                onClick={() => void handleSaveAnalysis()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savedAnalysisId ? "Salvar novamente" : "Salvar no histórico"}
              </button>
            ) : null}
            <ExportButtons result={result} />
          </div>
        </div>

        {saveMessage ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-4">
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
            {saveError}
          </p>
        ) : null}

        <p className="text-sm text-slate-600 mb-4">
          Seções marcadas como <strong>Editável</strong> podem ser corrigidas
          diretamente quando o edital não trouxer a informação ou a análise
          errar algum campo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{generatedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{MODE_LABELS[result.mode].title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Modelo: {result.model}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{result.documentSummary.length} documento(s)</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {result.documentSummary.map((doc) => (
            <span
              key={doc.name}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 rounded text-xs"
            >
              <FileText className="w-3 h-3" />
              {doc.name}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="doc-report-page p-6 md:p-10 lg:p-12">
          <EditableDocumentView
            markdown={result.analysis}
            onMarkdownChange={onAnalysisChange}
          />
        </div>
      </div>
    </section>
  );
}
