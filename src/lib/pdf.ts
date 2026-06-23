import type { UploadedDocument } from "./analysis-prompt";

/** Limite por documento na análise (caracteres) */
const MAX_CHARS_PER_DOCUMENT = 200_000;
/** Limite total enviado ao Gemini */
const MAX_TOTAL_CHARS = 500_000;

const TYPE_PRIORITY: Record<UploadedDocument["type"], number> = {
  edital: 0,
  termo_referencia: 1,
  anexo: 2,
  outro: 3,
};

export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  pageCount: number;
}> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);

  return {
    text: data.text ?? "",
    pageCount: data.numpages ?? 0,
  };
}

export function sortDocumentsByPriority(
  documents: UploadedDocument[]
): UploadedDocument[] {
  return [...documents].sort(
    (a, b) => TYPE_PRIORITY[a.type] - TYPE_PRIORITY[b.type]
  );
}

export function buildDocumentContext(documents: UploadedDocument[]): string {
  const typeLabels: Record<UploadedDocument["type"], string> = {
    edital: "EDITAL",
    termo_referencia: "TERMO DE REFERÊNCIA",
    anexo: "ANEXO",
    outro: "DOCUMENTO",
  };

  const sorted = sortDocumentsByPriority(documents);
  let totalChars = 0;
  const parts: string[] = [];

  for (const doc of sorted) {
    const label = typeLabels[doc.type];
    const truncated =
      doc.text.length > MAX_CHARS_PER_DOCUMENT
        ? doc.text.slice(0, MAX_CHARS_PER_DOCUMENT) +
          "\n\n[... TEXTO TRUNCADO — documento muito extenso ...]"
        : doc.text;

    const remaining = MAX_TOTAL_CHARS - totalChars;
    if (remaining <= 0) break;

    const chunk =
      truncated.length > remaining
        ? truncated.slice(0, remaining) +
          "\n\n[... TEXTO TRUNCADO — limite total atingido ...]"
        : truncated;

    parts.push(
      `\n\n========== ${label}: ${doc.name} (${doc.pageCount} páginas) ==========\n\n${chunk}`
    );
    totalChars += chunk.length;
  }

  return parts.join("");
}

export function validateDocuments(documents: UploadedDocument[]): string | null {
  if (!documents.length) {
    return "Envie pelo menos um documento (PDF) para análise.";
  }

  const hasContent = documents.some((doc) => doc.text.trim().length > 100);
  if (!hasContent) {
    return "Não foi possível extrair texto suficiente dos PDFs. Verifique se os arquivos não são apenas imagens escaneadas.";
  }

  return null;
}
