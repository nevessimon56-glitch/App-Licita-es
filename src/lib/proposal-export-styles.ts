/** Estilos compartilhados — layout fiel ao modelo Excel da proposta */
export const PROPOSAL_EXPORT_COLORS = {
  text: "000000",
  headerBg: "D9D9D9",
  border: "000000",
} as const;

/** docx usa half-points (9pt = 18) */
export const PROPOSAL_WORD_FONT = {
  family: "Arial",
  companyName: 22,
  companyDetail: 17,
  title: 24,
  body: 18,
  table: 16,
  tableSmall: 15,
  totalAmount: 28,
} as const;

/** pdfmake usa pontos */
export const PROPOSAL_PDF_FONT = {
  companyName: 11,
  companyDetail: 8.5,
  title: 12,
  body: 9,
  table: 8.5,
  tableSmall: 8,
  totalAmount: 14,
  lineHeight: 1.3,
  cellPadding: 7,
} as const;

export const PROPOSAL_PDF_COLORS = {
  border: "#000000",
  headerBg: "#d9d9d9",
} as const;

/** Quebra especificações longas em linhas legíveis (ponto-e-vírgula, quebra manual, etc.) */
export function formatSpecificationLines(spec: string): string[] {
  const trimmed = spec.trim();
  if (!trimmed) return [""];

  const chunks: string[] = [];

  for (const block of trimmed.split("\n")) {
    const parts = block
      .split(/;\s*/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length <= 1) {
      chunks.push(block.trim());
      continue;
    }

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      chunks.push(
        i < parts.length - 1 && !part.endsWith(";") ? `${part};` : part
      );
    }
  }

  return chunks.length ? chunks : [trimmed];
}

export function formatDeclarationLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatConditionLines(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [""];

  if (trimmed.length < 120 && !trimmed.includes(". ")) {
    return [trimmed.toUpperCase()];
  }

  return trimmed
    .split(/(?<=\.)\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toUpperCase());
}
