import OpenAI from "openai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { buildDocumentContext, validateDocuments } from "./pdf";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

export async function analyzeDocuments(
  documents: UploadedDocument[]
): Promise<AnalysisResponse> {
  const validationError = validateDocuments(documents);
  if (validationError) {
    throw new Error(validationError);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Defina a variável de ambiente no arquivo .env.local"
    );
  }

  const openai = new OpenAI({ apiKey });
  const context = buildDocumentContext(documents);

  const userMessage = `Analise integralmente os documentos abaixo e produza o resumo executivo conforme as instruções.

DOCUMENTOS FORNECIDOS (${documents.length} arquivo(s)):
${documents.map((d) => `- ${d.name} [${d.type}] — ${d.pageCount} páginas`).join("\n")}

${context}`;

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const analysis = completion.choices[0]?.message?.content;
  if (!analysis) {
    throw new Error("A IA não retornou conteúdo para a análise.");
  }

  return {
    analysis,
    documentSummary: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      charCount: doc.text.length,
    })),
    model: completion.model,
    generatedAt: new Date().toISOString(),
  };
}
