import { GoogleGenerativeAI } from "@google/generative-ai";

export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
] as const;

const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Obtenha em https://aistudio.google.com/apikey e defina na Vercel ou no .env.local"
    );
  }
  return key;
}

export function getPreferredModel(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
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

export function parseGeminiError(error: unknown): never {
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

interface GenerateOptions {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  history?: { role: "user" | "model"; parts: [{ text: string }] }[];
}

export async function generateWithGemini(options: GenerateOptions): Promise<{
  text: string;
  model: string;
}> {
  const apiKey = getGeminiApiKey();
  const preferredModel = getPreferredModel();
  const modelsToTry = [
    preferredModel,
    ...GEMINI_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: options.systemInstruction,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
        },
      });

      let result;
      if (options.history?.length) {
        const chat = model.startChat({ history: options.history });
        result = await chat.sendMessage(options.userMessage);
      } else {
        result = await model.generateContent(options.userMessage);
      }

      const text = result.response.text();
      if (!text?.trim()) {
        throw new Error("A IA não retornou conteúdo.");
      }

      return { text, model: modelName };
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
