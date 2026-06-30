export type ProposalExportKind = "proposta" | "declaracoes";

/** Remove traços unicode, acentos e caracteres inválidos para nome de arquivo / headers HTTP */
export function sanitizeDownloadFilename(filename: string): string {
  return filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015\u2212\u00AD]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Header seguro para download (somente ASCII — evita erro ByteString no fetch) */
export function buildContentDisposition(filename: string): string {
  const safe = sanitizeDownloadFilename(filename);
  return `attachment; filename="${safe || "documento.pdf"}"`;
}

/** Nome de arquivo: "Proposta Olimpia" ou "Declaracoes Olimpia" */
export function buildProposalExportFilename(
  orgao: string,
  kind: ProposalExportKind = "proposta"
): string {
  const cleaned =
    sanitizeDownloadFilename(orgao).slice(0, 80) || "Orgao";

  return kind === "proposta" ? `Proposta ${cleaned}` : `Declaracoes ${cleaned}`;
}
