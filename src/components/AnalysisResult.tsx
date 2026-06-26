"use client";

import { FileText, Clock, Cpu, Layers } from "lucide-react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { MODE_LABELS } from "@/lib/analysis-prompt";
import { ExportButtons } from "./ExportButtons";
import { EditableDocumentView } from "./EditableDocumentView";

interface Props {
  result: AnalysisResponse;
  onAnalysisChange: (analysis: string) => void;
}

export function AnalysisResult({ result, onAnalysisChange }: Props) {
  const generatedDate = new Date(result.generatedAt).toLocaleString("pt-BR");

  return (
    <section className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Resumo gerado</h2>
          <ExportButtons result={result} />
        </div>

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
