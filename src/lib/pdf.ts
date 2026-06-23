import type { UploadedDocument } from "./analysis-prompt";
import { MAX_FILES_PER_ANALYSIS } from "./file-limits";

export { MAX_FILES_PER_ANALYSIS } from "./file-limits";

/** Limite por documento na análise (caracteres) */
const MAX_CHARS_PER_DOCUMENT = 180_000;
/** Limite total enviado ao Gemini — dividido entre todos os arquivos */
const MAX_TOTAL_CHARS = 600_000;

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
    anexo: "ANEXO TÉCNICO",
    outro: "DOCUMENTO",
  };

  const sorted = sortDocumentsByPriority(documents);
  let totalChars = 0;
  const parts: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const doc = sorted[i];
    const label = typeLabels[doc.type];
    const docsRemaining = sorted.length - i;
    const remainingBudget = MAX_TOTAL_CHARS - totalChars;

    if (remainingBudget <= 0) break;

    // Garante espaço mínimo para cada arquivo (importante com 3+ PDFs)
    const fairShare = Math.floor(remainingBudget / docsRemaining);
    const docBudget = Math.min(MAX_CHARS_PER_DOCUMENT, fairShare);

    const truncated =
      doc.text.length > docBudget
        ? doc.text.slice(0, docBudget) +
          "\n\n[... TEXTO TRUNCADO — documento muito extenso ...]"
        : doc.text;

    parts.push(
      `\n\n========== ${label}: ${doc.name} (${doc.pageCount} páginas) ==========\n\n${truncated}`
    );
    totalChars += truncated.length;
  }

  if (sorted.length > parts.length) {
    parts.push(
      `\n\n[AVISO: ${sorted.length - parts.length} documento(s) não couberam no limite de contexto e foram omitidos parcialmente.]`
    );
  }

  return parts.join("");
}

export function validateDocuments(documents: UploadedDocument[]): string | null {
  if (!documents.length) {
    return "Envie pelo menos um documento (PDF) para análise.";
  }

  if (documents.length > MAX_FILES_PER_ANALYSIS) {
    return `Máximo de ${MAX_FILES_PER_ANALYSIS} PDFs por análise.`;
  }

  const hasContent = documents.some((doc) => doc.text.trim().length > 100);
  if (!hasContent) {
    return "Não foi possível extrair texto suficiente dos PDFs. Verifique se os arquivos não são apenas imagens escaneadas.";
  }

  return null;
}
