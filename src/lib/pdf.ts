import type { UploadedDocument } from "./analysis-prompt";

const MAX_CHARS_PER_DOCUMENT = 500_000;
const MAX_TOTAL_CHARS = 1_200_000;

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

export function buildDocumentContext(documents: UploadedDocument[]): string {
  const typeLabels: Record<UploadedDocument["type"], string> = {
    edital: "EDITAL",
    termo_referencia: "TERMO DE REFERÊNCIA",
    anexo: "ANEXO",
    outro: "DOCUMENTO",
  };

  let totalChars = 0;
  const parts: string[] = [];

  for (const doc of documents) {
    const label = typeLabels[doc.type];
    const truncated =
      doc.text.length > MAX_CHARS_PER_DOCUMENT
        ? doc.text.slice(0, MAX_CHARS_PER_DOCUMENT) +
          "\n\n[... TEXTO TRUNCADO POR LIMITE DE TAMANHO ...]"
        : doc.text;

    const remaining = MAX_TOTAL_CHARS - totalChars;
    if (remaining <= 0) break;

    const chunk =
      truncated.length > remaining
        ? truncated.slice(0, remaining) +
          "\n\n[... TEXTO TRUNCADO POR LIMITE TOTAL ...]"
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
