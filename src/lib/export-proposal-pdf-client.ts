import type { TDocumentDefinitions } from "pdfmake/interfaces";
import { downloadBlob } from "./document-parser";
import { buildProposalExportFilename, type ProposalExportKind } from "./proposal-export-filename";
import {
  buildDeclarationsPdfDefinition,
  buildProposalPdfDefinition,
} from "./proposal-pdf-document";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

type PdfMakeInstance = {
  vfs: Record<string, string>;
  createPdf: (
    docDefinition: TDocumentDefinitions
  ) => {
    getBlob: (callback: (blob: Blob) => void) => void;
    download: (filename?: string) => void;
  };
};

async function loadPdfMake(): Promise<PdfMakeInstance> {
  const [pdfMakeModule, vfsModule] = await Promise.all([
    import("pdfmake/build/pdfmake"),
    import("pdfmake/build/vfs_fonts"),
  ]);

  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as PdfMakeInstance;
  const vfs = (vfsModule.default ?? vfsModule) as Record<string, string>;
  pdfMake.vfs = vfs;
  return pdfMake;
}

function buildDocDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile,
  kind: ProposalExportKind
): TDocumentDefinitions {
  return kind === "proposta"
    ? buildProposalPdfDefinition(pkg, company)
    : buildDeclarationsPdfDefinition(pkg, company);
}

/** Gera PDF no navegador — gratuito e não depende do servidor Render. */
export async function exportProposalPdfInBrowser(
  pkg: ProposalPackage,
  company: CompanyProfile,
  kind: ProposalExportKind
): Promise<void> {
  const pdfMake = await loadPdfMake();
  const docDefinition = buildDocDefinition(pkg, company, kind);
  const filename = `${buildProposalExportFilename(pkg.metadata.orgao, kind)}.pdf`;

  await new Promise<void>((resolve, reject) => {
    try {
      pdfMake.createPdf(docDefinition).getBlob((blob) => {
        if (!blob?.size) {
          reject(new Error("O PDF gerado está vazio. Tente novamente."));
          return;
        }
        downloadBlob(blob, filename);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}
