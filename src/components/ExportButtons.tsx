"use client";

import { useState } from "react";
import { Download, FileText, FileType, Loader2 } from "lucide-react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { buildExportFilename, downloadBlob } from "@/lib/document-parser";

interface Props {
  result: AnalysisResponse;
}

export function ExportButtons({ result }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "word" | "md" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExportMarkdown = () => {
    setExporting("md");
    setError(null);
    try {
      const blob = new Blob([result.analysis], { type: "text/markdown;charset=utf-8" });
      downloadBlob(blob, `${buildExportFilename()}.md`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar Markdown.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportWord = async () => {
    setExporting("word");
    setError(null);
    try {
      const { exportAnalysisToWord } = await import("@/lib/export-word");
      await exportAnalysisToWord(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar Word.");
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    setError(null);
    try {
      const { exportAnalysisToPdf } = await import("@/lib/export-pdf");
      await exportAnalysisToPdf(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar PDF.");
    } finally {
      setExporting(null);
    }
  };

  const isBusy = exporting !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleExportPdf}
          disabled={isBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {exporting === "pdf" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Exportar PDF
        </button>

        <button
          onClick={handleExportWord}
          disabled={isBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {exporting === "word" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileType className="w-4 h-4" />
          )}
          Exportar Word
        </button>

        <button
          onClick={handleExportMarkdown}
          disabled={isBusy}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          {exporting === "md" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Exportar Markdown
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
