"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText, Clock, Cpu } from "lucide-react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { ANALYSIS_SECTIONS } from "@/lib/analysis-prompt";
import { ExportButtons } from "./ExportButtons";

interface Props {
  result: AnalysisResponse;
}

export function AnalysisResult({ result }: Props) {
  const generatedDate = new Date(result.generatedAt).toLocaleString("pt-BR");

  return (
    <section className="space-y-6">
      {/* Meta info */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Resumo da análise
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{generatedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span>Modelo: {result.model}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>{result.documentSummary.length} documento(s)</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {result.documentSummary.map((doc) => (
            <span
              key={doc.name}
              className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs"
            >
              <FileText className="w-3 h-3" />
              {doc.name} ({doc.pageCount} pág.)
            </span>
          ))}
        </div>

        {/* Section index */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-3">
            Exportar análise
          </p>
          <ExportButtons result={result} />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-xs font-medium text-slate-500 mb-2">
            Tópicos analisados ({ANALYSIS_SECTIONS.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ANALYSIS_SECTIONS.map((section, i) => (
              <span
                key={section}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
              >
                {i + 1}. {section}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="analysis-content prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {result.analysis}
          </ReactMarkdown>
        </div>
      </div>
    </section>
  );
}
