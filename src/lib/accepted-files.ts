/** Extensões aceitas para upload */
export const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"] as const;

export const ACCEPTED_FILE_INPUT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isAcceptedFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function acceptedFormatsLabel(): string {
  return "PDF, DOC e DOCX";
}
