import type { AnalysisResponse } from "./analysis-prompt";
import { buildExportFilename, downloadBlob } from "./document-parser";

const PDF_EXPORT_TIMEOUT_MS = 90_000;

export async function exportAnalysisToPdf(result: AnalysisResponse): Promise<void> {
  const prefix =
    result.mode === "resumido" ? "resumo-edital-resumido" : "resumo-edital-completo";
  const filename = `${buildExportFilename(prefix)}.pdf`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PDF_EXPORT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysis: result.analysis,
        documentSummary: result.documentSummary,
        generatedAt: result.generatedAt,
        mode: result.mode,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(payload?.error ?? "Não foi possível gerar o PDF.");
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("O PDF gerado está vazio. Tente novamente.");
    }

    downloadBlob(blob, filename);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "A geração do PDF demorou demais. Tente novamente ou exporte em Word."
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
