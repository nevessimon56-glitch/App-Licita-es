export type ProposalExportKind = "proposta" | "declaracoes";

/** Nome de arquivo: "Proposta Olimpia" ou "Declaracoes Olimpia" */
export function buildProposalExportFilename(
  orgao: string,
  kind: ProposalExportKind = "proposta"
): string {
  const cleaned =
    orgao
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80) || "Orgao";

  return kind === "proposta" ? `Proposta ${cleaned}` : `Declaracoes ${cleaned}`;
}
