import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { buildDocumentContext, validateDocuments } from "./pdf";

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Obtenha em https://aistudio.google.com/apikey e defina na Vercel ou no .env.local"
    );
  }
  return key;
}

export async function analyzeDocuments(
  documents: UploadedDocument[]
): Promise<AnalysisResponse> {
  const validationError = validateDocuments(documents);
  if (validationError) {
    throw new Error(validationError);
  }

  const apiKey = getApiKey();
  const context = buildDocumentContext(documents);

  const userMessage = `Analise integralmente os documentos abaixo e produza o resumo executivo conforme as instruções.

DOCUMENTOS FORNECIDOS (${documents.length} arquivo(s)):
${documents.map((d) => `- ${d.name} [${d.type}] — ${d.pageCount} páginas`).join("\n")}

${context}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
    },
  });

  let result;
  try {
    result = await model.generateContent(userMessage);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new Error(
        "Limite de uso da API Gemini atingido. Verifique seu plano em https://aistudio.google.com"
      );
    }
    if (message.includes("403") || message.toLowerCase().includes("api key")) {
      throw new Error(
        "Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em https://aistudio.google.com/apikey"
      );
    }
    throw new Error(`Erro na API Gemini: ${message}`);
  }

  const analysis = result.response.text();

  if (!analysis?.trim()) {
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
    model: DEFAULT_MODEL,
    generatedAt: new Date().toISOString(),
  };
}
