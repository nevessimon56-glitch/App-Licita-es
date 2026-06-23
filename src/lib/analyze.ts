import {
  ANALYSIS_SYSTEM_PROMPT,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { generateWithGemini, ANALYSIS_MODELS } from "./gemini";
import { buildDocumentContext, validateDocuments } from "./pdf";

const MAX_CHAT_DOC_CHARS = 80_000;

export async function analyzeDocuments(
  documents: UploadedDocument[]
): Promise<AnalysisResponse> {
  const validationError = validateDocuments(documents);
  if (validationError) {
    throw new Error(validationError);
  }

  const context = buildDocumentContext(documents);

  const userMessage = `Analise integralmente os documentos abaixo e produza o resumo executivo conforme as instruções de formato.

DOCUMENTOS FORNECIDOS (${documents.length} arquivo(s)):
${documents.map((d) => `- ${d.name} [${d.type}] — ${d.pageCount} páginas`).join("\n")}

${context}`;

  const { text: analysis, model } = await generateWithGemini({
    systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    userMessage,
    temperature: 0.1,
    maxOutputTokens: 12_000,
    models: ANALYSIS_MODELS,
  });

  return {
    analysis,
    documentSummary: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      charCount: doc.text.length,
    })),
    documents: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      text:
        doc.text.length > MAX_CHAT_DOC_CHARS
          ? doc.text.slice(0, MAX_CHAT_DOC_CHARS) +
            "\n\n[... texto truncado para contexto do chat ...]"
          : doc.text,
    })),
    model,
    generatedAt: new Date().toISOString(),
  };
}
