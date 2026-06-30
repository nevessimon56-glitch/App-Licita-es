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
  table: 8,
  tableSmall: 7.5,
  totalAmount: 13,
  lineHeight: 1.05,
  cellPadding: 3,
} as const;

export const PROPOSAL_PDF_COLORS = {
  border: "#000000",
  headerBg: "#d9d9d9",
} as const;

const LOTE_HIDDEN = new Set([
  "",
  "NÃO APLICÁVEL",
  "NAO APLICAVEL",
  "N/A",
  "NA",
  "-",
  "—",
  "NÃO INFORMADO",
  "NAO INFORMADO",
]);

export function shouldShowLote(lote: string): boolean {
  const normalized = lote.trim().toUpperCase();
  return !LOTE_HIDDEN.has(normalized);
}

/** Texto corrido na célula — sem quebrar cada ponto-e-vírgula em linha nova */
export function formatSpecificationForExport(spec: string): string {
  return spec
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function formatConditionForExport(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export const PROPOSAL_SEM_INSTALACAO_SUFFIX = " - SEM INSTALAÇÃO.";

/** docx: RRGGBB sem # */
export const PROPOSAL_SEM_INSTALACAO_COLOR = "FF0000";

/** pdfmake */
export const PROPOSAL_SEM_INSTALACAO_COLOR_PDF = "#FF0000";

export function formatDeclarationLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
