import { Packer } from "docx";
import { downloadBlob } from "./document-parser";
import { buildProposalExportFilename } from "./proposal-export-filename";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";
import {
  buildDeclarationsWordDocument,
  buildProposalWordDocument,
} from "./proposal-word-document";

export async function exportProposalToWord(
  pkg: ProposalPackage,
  company: CompanyProfile
): Promise<void> {
  const doc = buildProposalWordDocument(pkg, company);
  const blob = await Packer.toBlob(doc);
  const filename = `${buildProposalExportFilename(pkg.metadata.orgao, "proposta")}.docx`;
  downloadBlob(blob, filename);
}

export async function exportDeclarationsToWord(
  pkg: ProposalPackage,
  company: CompanyProfile
): Promise<void> {
  const doc = buildDeclarationsWordDocument(pkg, company);
  const blob = await Packer.toBlob(doc);
  const filename = `${buildProposalExportFilename(pkg.metadata.orgao, "declaracoes")}.docx`;
  downloadBlob(blob, filename);
}
