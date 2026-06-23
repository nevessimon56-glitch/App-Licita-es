import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ANALYSIS_SYSTEM_PROMPT,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { buildDocumentContext, validateDocuments } from "./pdf";

/** Modelos atuais suportados (mar/2026). gemini-2.0-flash foi descontinuado. */
export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
] as const;

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Obtenha em https://aistudio.google.com/apikey e defina na Vercel ou no .env.local"
    );
  }
  return key;
}

function isModelUnavailableError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    message.includes("404") ||
    lower.includes("no longer available") ||
    lower.includes("not found") ||
    lower.includes("is not supported")
  );
}

function parseGeminiError(error: unknown): never {
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
  if (isModelUnavailableError(message)) {
    throw new Error(
      `Modelo Gemini indisponível. Atualize GEMINI_MODEL na Vercel para um destes: ${GEMINI_MODELS.join(", ")}`
    );
  }

  throw new Error(`Erro na API Gemini: ${message}`);
}

async function generateWithModel(
  apiKey: string,
  modelName: string,
  userMessage: string
) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.1,
    },
  });

  return model.generateContent(userMessage);
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

  const preferredModel = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const modelsToTry = [
    preferredModel,
    ...GEMINI_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: unknown;
  let usedModel = preferredModel;

  for (const modelName of modelsToTry) {
    try {
      const result = await generateWithModel(apiKey, modelName, userMessage);
      const analysis = result.response.text();

      if (!analysis?.trim()) {
        throw new Error("A IA não retornou conteúdo para a análise.");
      }

      usedModel = modelName;

      return {
        analysis,
        documentSummary: documents.map((doc) => ({
          name: doc.name,
          type: doc.type,
          pageCount: doc.pageCount,
          charCount: doc.text.length,
        })),
        model: usedModel,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (isModelUnavailableError(message)) {
        lastError = error;
        console.warn(`Modelo ${modelName} indisponível, tentando próximo...`);
        continue;
      }

      parseGeminiError(error);
    }
  }

  parseGeminiError(lastError);
}
