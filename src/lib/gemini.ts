import { ApiError, GoogleGenAI } from "@google/genai";

/** Modelos para análise — Flash primeiro (qualidade), Lite como fallback */
export const ANALYSIS_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

/** Modelos para chat */
export const CHAT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
] as const;

export const GEMINI_MODELS = [
  ...ANALYSIS_MODELS,
  "gemini-2.5-pro",
  "gemini-3-flash-preview",
] as const;

const DEFAULT_ANALYSIS_MODEL = "gemini-2.5-flash";
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Obtenha em https://aistudio.google.com/apikey e defina na Render ou no .env.local"
    );
  }
  return key.trim();
}

export function getAnalysisModel(): string {
  return (
    process.env.GEMINI_ANALYSIS_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_ANALYSIS_MODEL
  );
}

export function getChatModel(): string {
  return (
    process.env.GEMINI_CHAT_MODEL ??
    process.env.GEMINI_MODEL ??
    DEFAULT_CHAT_MODEL
  );
}

interface GeminiErrorDetails {
  message: string;
  status?: number;
}

function getErrorDetails(error: unknown): GeminiErrorDetails {
  if (error instanceof ApiError) {
    return { message: error.message, status: error.status };
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/\b(401|403|404|429|500)\b/);
    return {
      message: error.message,
      status: statusMatch ? Number(statusMatch[1]) : undefined,
    };
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const message =
      typeof record.message === "string"
        ? record.message
        : JSON.stringify(error);
    const status =
      typeof record.status === "number"
        ? record.status
        : typeof record.code === "number"
          ? record.code
          : undefined;
    return { message, status };
  }

  return { message: String(error) };
}

function isAuthError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return (
    details.status === 401 ||
    details.status === 403 ||
    lower.includes("invalid_api_key") ||
    lower.includes("unauthenticated") ||
    lower.includes("api key") ||
    lower.includes("access_token_type_unsupported") ||
    lower.includes("authentication")
  );
}

function isModelUnavailableError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return (
    details.status === 404 ||
    lower.includes("no longer available") ||
    lower.includes("is not supported") ||
    (lower.includes("not found") && lower.includes("model"))
  );
}

function isQuotaError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return details.status === 429 || lower.includes("quota") || lower.includes("rate limit");
}

export function parseGeminiError(error: unknown): never {
  const details = getErrorDetails(error);

  if (isQuotaError(details)) {
    throw new Error(
      "Limite de uso da API Gemini atingido. Verifique seu plano em https://aistudio.google.com"
    );
  }
  if (isAuthError(details)) {
    throw new Error(
      "Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em https://aistudio.google.com/apikey (chaves novas começam com AQ.)."
    );
  }
  if (isModelUnavailableError(details)) {
    throw new Error(
      `Modelo Gemini indisponível (${getAnalysisModel()} / ${getChatModel()}). Tente GEMINI_ANALYSIS_MODEL=gemini-2.5-flash-lite na Render. Detalhe: ${details.message}`
    );
  }

  throw new Error(`Erro na API Gemini: ${details.message}`);
}

interface GenerateOptions {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  maxOutputTokens?: number;
  models?: readonly string[];
  history?: { role: "user" | "model"; parts: [{ text: string }] }[];
  responseMimeType?: string;
}

function createGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
}

function buildContents(options: GenerateOptions) {
  if (options.history?.length) {
    return [
      ...options.history.map((entry) => ({
        role: entry.role,
        parts: entry.parts,
      })),
      {
        role: "user" as const,
        parts: [{ text: options.userMessage }],
      },
    ];
  }

  return [
    {
      role: "user" as const,
      parts: [{ text: options.userMessage }],
    },
  ];
}

async function generateWithGeminiSdk(
  ai: GoogleGenAI,
  modelName: string,
  options: GenerateOptions
): Promise<string> {
  const config = {
    systemInstruction: options.systemInstruction,
    temperature: options.temperature ?? 0.2,
    ...(options.maxOutputTokens
      ? { maxOutputTokens: options.maxOutputTokens }
      : {}),
    ...(options.responseMimeType
      ? { responseMimeType: options.responseMimeType }
      : {}),
  };

  if (options.history?.length) {
    const chat = ai.chats.create({
      model: modelName,
      config,
      history: options.history,
    });
    const response = await chat.sendMessage({
      message: options.userMessage,
    });
    return response.text ?? "";
  }

  const response = await ai.models.generateContent({
    model: modelName,
    contents: options.userMessage,
    config,
  });
  return response.text ?? "";
}

async function generateWithGeminiRest(
  modelName: string,
  options: GenerateOptions
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${modelName}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: options.systemInstruction }],
        },
        contents: buildContents(options),
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          ...(options.maxOutputTokens
            ? { maxOutputTokens: options.maxOutputTokens }
            : {}),
          ...(options.responseMimeType
            ? { responseMimeType: options.responseMimeType }
            : {}),
        },
      }),
    }
  );

  const payload = (await response.json()) as {
    error?: { message?: string; code?: number; status?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!response.ok) {
    const apiMessage =
      payload.error?.message ??
      `HTTP ${response.status} ao chamar Gemini (${modelName})`;
    const error = new Error(apiMessage) as Error & { status?: number };
    error.status = payload.error?.code ?? response.status;
    throw error;
  }

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text;
}

export async function testGeminiConnection(): Promise<{
  ok: boolean;
  model?: string;
  transport?: "sdk" | "rest";
  error?: string;
}> {
  try {
    const { model } = await generateWithGemini({
      systemInstruction: "Responda apenas OK.",
      userMessage: "ping",
      models: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash"],
      maxOutputTokens: 16,
      temperature: 0,
    });
    return { ok: true, model };
  } catch (error) {
    return {
      ok: false,
      error: getErrorDetails(error).message,
    };
  }
}

export async function generateWithGemini(options: GenerateOptions): Promise<{
  text: string;
  model: string;
}> {
  const ai = createGeminiClient();
  const preferred = options.models?.[0] ?? getAnalysisModel();
  const fallbackList = options.models ?? ANALYSIS_MODELS;
  const modelsToTry = [
    preferred,
    ...fallbackList.filter((m) => m !== preferred),
  ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    const attempts: Array<{
      transport: "sdk" | "rest";
      run: () => Promise<string>;
    }> = [
      { transport: "sdk", run: () => generateWithGeminiSdk(ai, modelName, options) },
      { transport: "rest", run: () => generateWithGeminiRest(modelName, options) },
    ];

    for (const attempt of attempts) {
      try {
        const text = await attempt.run();
        if (!text.trim()) {
          throw new Error("A IA não retornou conteúdo.");
        }
        return { text, model: modelName };
      } catch (error) {
        const details = getErrorDetails(error);
        if (isAuthError(details) || isQuotaError(details)) {
          parseGeminiError(error);
        }
        if (isModelUnavailableError(details)) {
          lastError = error;
          console.warn(
            `Gemini ${modelName} via ${attempt.transport} indisponível: ${details.message}`
          );
          continue;
        }
        lastError = error;
        console.warn(
          `Gemini ${modelName} via ${attempt.transport} falhou: ${details.message}`
        );
      }
    }
  }

  parseGeminiError(lastError);
}
