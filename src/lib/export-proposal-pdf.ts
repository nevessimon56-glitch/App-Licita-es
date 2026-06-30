import { buildProposalExportFilename, type ProposalExportKind } from "./proposal-export-filename";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const PDF_EXPORT_TIMEOUT_MS = 90_000;

interface ProposalPdfExportBody {
  kind: ProposalExportKind;
  proposalPackage: ProposalPackage;
  companyProfile: CompanyProfile;
}

async function loadBrowserPdfExporter() {
  return import("@/lib/export-proposal-pdf-client");
}

async function exportProposalPdfOnServer(
  pkg: ProposalPackage,
  company: CompanyProfile,
  kind: ProposalExportKind
): Promise<void> {
  const { downloadBlob } = await import("./document-parser");
  const filename = `${buildProposalExportFilename(pkg.metadata.orgao, kind)}.pdf`;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PDF_EXPORT_TIMEOUT_MS);

  try {
    const body: ProposalPdfExportBody = {
      kind,
      proposalPackage: pkg,
      companyProfile: company,
    };

    const response = await fetch("/api/export/proposal/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Não foi possível gerar o PDF no servidor.");
      }
      throw new Error(
        `Servidor respondeu com erro ${response.status}. Tente novamente em alguns segundos.`
      );
    }

    const blob = await response.blob();
    if (!blob.size) {
      throw new Error("O PDF gerado está vazio. Tente novamente.");
    }

    downloadBlob(blob, filename);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "A geração do PDF demorou demais no servidor. Tente novamente."
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function exportProposalDocumentToPdf(
  pkg: ProposalPackage,
  company: CompanyProfile,
  kind: ProposalExportKind
): Promise<void> {
  try {
    const { exportProposalPdfInBrowser } = await loadBrowserPdfExporter();
    await exportProposalPdfInBrowser(pkg, company, kind);
  } catch (browserError) {
    console.warn("PDF no navegador falhou, tentando servidor:", browserError);
    try {
      await exportProposalPdfOnServer(pkg, company, kind);
    } catch (serverError) {
      const browserMessage =
        browserError instanceof Error ? browserError.message : "erro no navegador";
      const serverMessage =
        serverError instanceof Error ? serverError.message : "erro no servidor";
      throw new Error(
        `Não foi possível gerar o PDF. ${browserMessage} | Servidor: ${serverMessage}`
      );
    }
  }
}

export async function exportProposalToPdf(
  pkg: ProposalPackage,
  company: CompanyProfile
): Promise<void> {
  return exportProposalDocumentToPdf(pkg, company, "proposta");
}

export async function exportDeclarationsToPdf(
  pkg: ProposalPackage,
  company: CompanyProfile
): Promise<void> {
  return exportProposalDocumentToPdf(pkg, company, "declaracoes");
}
