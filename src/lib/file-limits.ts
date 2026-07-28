/** Máximo de documentos por análise (PDF, DOC, DOCX) */
export const MAX_FILES_PER_ANALYSIS = 10;

/** Tamanho máximo por arquivo (25 MB) */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Tamanho máximo total do upload (80 MB) */
export const MAX_TOTAL_UPLOAD_BYTES = 80 * 1024 * 1024;

export function validateFileCount(count: number): string | null {
  if (count > MAX_FILES_PER_ANALYSIS) {
    return `Máximo de ${MAX_FILES_PER_ANALYSIS} arquivos por análise.`;
  }
  return null;
}

export function validateFileSizes(files: { name: string; size: number }[]): string | null {
  let total = 0;

  for (const file of files) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const maxMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
      return `O arquivo "${file.name}" excede ${maxMb} MB.`;
    }
    total += file.size;
  }

  if (total > MAX_TOTAL_UPLOAD_BYTES) {
    const maxTotalMb = Math.round(MAX_TOTAL_UPLOAD_BYTES / (1024 * 1024));
    return `O total dos arquivos excede ${maxTotalMb} MB.`;
  }

  return null;
}
