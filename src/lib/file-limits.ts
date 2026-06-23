/** Máximo de PDFs por análise */
export const MAX_FILES_PER_ANALYSIS = 10;

export function validateFileCount(count: number): string | null {
  if (count > MAX_FILES_PER_ANALYSIS) {
    return `Máximo de ${MAX_FILES_PER_ANALYSIS} PDFs por análise.`;
  }
  return null;
}
