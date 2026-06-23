/** Máximo de documentos por análise (PDF, DOC, DOCX) */
export const MAX_FILES_PER_ANALYSIS = 10;

export function validateFileCount(count: number): string | null {
  if (count > MAX_FILES_PER_ANALYSIS) {
    return `Máximo de ${MAX_FILES_PER_ANALYSIS} arquivos por análise.`;
  }
  return null;
}
