"use client";

import { useState } from "react";
import { FileText, FileType, Loader2 } from "lucide-react";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";
import type { ProposalExportKind } from "@/lib/proposal-export-filename";
import { exportProposalDocumentToPdf } from "@/lib/export-proposal-pdf";
import { isChunkLoadError, recoverFromChunkError } from "@/lib/chunk-error";

interface Props {
  pkg: ProposalPackage;
  company: CompanyProfile;
  kind: ProposalExportKind;
}

async function loadWordExporter() {
  try {
    return await import("@/lib/export-proposal-word");
  } catch (error) {
    if (recoverFromChunkError(error)) {
      throw new Error("Atualizando a página com a versão mais recente...");
    }
    throw error;
  }
}

function getExportErrorMessage(error: unknown, fallback: string): string {
  if (recoverFromChunkError(error)) {
    return "Atualizando a página com a versão mais recente...";
  }
  if (isChunkLoadError(error)) {
    return "Há uma versão nova do app. Atualize a página (F5) e tente novamente.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function ProposalExportButtons({ pkg, company, kind }: Props) {
  const [exporting, setExporting] = useState<"pdf" | "word" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = kind === "proposta" ? "proposta" : "declarações";

  const handleExportWord = async () => {
    setExporting("word");
    setError(null);
    try {
      const { exportProposalToWord, exportDeclarationsToWord } =
        await loadWordExporter();
      if (kind === "proposta") {
        await exportProposalToWord(pkg, company);
      } else {
        await exportDeclarationsToWord(pkg, company);
      }
    } catch (err) {
      setError(getExportErrorMessage(err, `Erro ao exportar ${label} em Word.`));
    } finally {
      setExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setExporting("pdf");
    setError(null);
    try {
      await exportProposalDocumentToPdf(pkg, company, kind);
    } catch (err) {
      setError(getExportErrorMessage(err, `Erro ao exportar ${label} em PDF.`));
    } finally {
      setExporting(null);
    }
  };

  const isBusy = exporting !== null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isBusy}
          className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {exporting === "pdf" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          Salvar PDF
        </button>

        <button
          type="button"
          onClick={handleExportWord}
          disabled={isBusy}
          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50"
        >
          {exporting === "word" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileType className="w-4 h-4" />
          )}
          Salvar Word
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Arquivo:{" "}
        <strong>
          {kind === "proposta" ? "Proposta" : "Declaracoes"}{" "}
          {pkg.metadata.orgao || "Orgao"}
        </strong>
        .pdf / .docx — exportação <strong>gratuita</strong> (PDF gerado no navegador)
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
