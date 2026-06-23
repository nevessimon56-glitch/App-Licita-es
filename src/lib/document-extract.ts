import mammoth from "mammoth";

export type DocumentFileFormat = "pdf" | "docx" | "doc";

export interface ExtractedDocumentText {
  text: string;
  pageCount: number;
  format: DocumentFileFormat;
}

function getFormat(filename: string): DocumentFileFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".doc")) return "doc";
  return null;
}

/** Estimativa de páginas para Word (não há contagem real no arquivo) */
function estimatePageCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 2800));
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractedDocumentText> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return {
    text: data.text ?? "",
    pageCount: data.numpages ?? 0,
    format: "pdf",
  };
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractedDocumentText> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value ?? "";
  return {
    text,
    pageCount: estimatePageCount(text),
    format: "docx",
  };
}

async function extractFromDoc(buffer: Buffer): Promise<ExtractedDocumentText> {
  const WordExtractor = (await import("word-extractor")).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(buffer);
  const text = doc.getBody() ?? "";
  return {
    text,
    pageCount: estimatePageCount(text),
    format: "doc",
  };
}

export async function extractTextFromDocument(
  buffer: Buffer,
  filename: string
): Promise<ExtractedDocumentText> {
  const format = getFormat(filename);
  if (!format) {
    throw new Error(
      `Formato não suportado: "${filename}". Use PDF, DOC ou DOCX.`
    );
  }

  switch (format) {
    case "pdf":
      return extractFromPdf(buffer);
    case "docx":
      return extractFromDocx(buffer);
    case "doc":
      return extractFromDoc(buffer);
  }
}

/** @deprecated Use extractTextFromDocument */
export async function extractTextFromPdf(buffer: Buffer) {
  const result = await extractFromPdf(buffer);
  return { text: result.text, pageCount: result.pageCount };
}
