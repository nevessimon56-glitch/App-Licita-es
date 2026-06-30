import { downloadBlob } from "./document-parser";
import { buildProposalExportFilename, type ProposalExportKind } from "./proposal-export-filename";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const PDF_EXPORT_TIMEOUT_MS = 90_000;

interface ProposalPdfExportBody {
  kind: ProposalExportKind;
  proposalPackage: ProposalPackage;
  companyProfile: CompanyProfile;
}

export async function exportProposalDocumentToPdf(
  pkg: ProposalPackage,
  company: CompanyProfile,
  kind: ProposalExportKind
): Promise<void> {
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
