import { ApiError, GoogleGenAI } from "@google/genai";

/** Modelos para análise — 2.5-flash não está disponível para contas novas */
export const ANALYSIS_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
] as const;

/** Modelos para chat */
export const CHAT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
] as const;

export const GEMINI_MODELS = [
  ...ANALYSIS_MODELS,
  "gemini-2.5-pro",
] as const;

const DEFAULT_ANALYSIS_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_CHAT_MODEL = "gemini-2.5-flash-lite";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const RATE_LIMIT_DELAYS_MS = [8_000, 20_000, 45_000];

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isNewUserModelBlockedError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return lower.includes("no longer available to new users");
}

function isRateLimitError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return (
    details.status === 429 ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted") ||
    lower.includes("per minute") ||
    lower.includes("rpm")
  );
}

function isQuotaExhaustedError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return (
    lower.includes("quota") &&
    !isRateLimitError(details) &&
    (lower.includes("exceeded") ||
      lower.includes("billing") ||
      lower.includes("daily") ||
      lower.includes("monthly"))
  );
}

function isFreeTierQuotaError(details: GeminiErrorDetails): boolean {
  const lower = details.message.toLowerCase();
  return lower.includes("free_tier") || lower.includes("free tier");
}

export function parseGeminiError(error: unknown): never {
  const details = getErrorDetails(error);

  if (isFreeTierQuotaError(details)) {
    throw new Error(
      "Sua chave está no plano GRATUITO do Gemini (free_tier), não no pago. Vincule faturamento ao projeto da chave em https://aistudio.google.com → Settings → Plan / Billing. Depois use GEMINI_ANALYSIS_MODEL=gemini-2.5-flash-lite."
    );
  }
  if (isRateLimitError(details)) {
    throw new Error(
      "Muitas requisições em pouco tempo na API Gemini. Aguarde 1–2 minutos e tente de novo. No plano gratuito o limite por minuto é baixo — uma análise grande pode precisar de algumas tentativas."
    );
  }
  if (isQuotaExhaustedError(details)) {
    throw new Error(
      `Cota diária/mensal da API Gemini esgotada. Verifique em https://aistudio.google.com — detalhe: ${details.message}`
    );
  }
  if (isAuthError(details)) {
    throw new Error(
      "Chave GEMINI_API_KEY inválida ou sem permissão. Verifique em https://aistudio.google.com/apikey (chaves novas começam com AQ.)."
    );
  }
  if (isNewUserModelBlockedError(details)) {
    throw new Error(
      "O modelo gemini-2.5-flash não está disponível para contas novas. Na Render, use GEMINI_ANALYSIS_MODEL=gemini-2.5-flash-lite e GEMINI_CHAT_MODEL=gemini-2.5-flash-lite."
    );
  }
  if (isModelUnavailableError(details)) {
    throw new Error(
      `Modelo Gemini indisponível (${getAnalysisModel()} / ${getChatModel()}). Use GEMINI_ANALYSIS_MODEL=gemini-2.5-flash-lite ou gemini-3-flash-preview na Render. Detalhe: ${details.message}`
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

function usesAuthKey(): boolean {
  return getGeminiApiKey().startsWith("AQ.");
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

async function runWithRateLimitRetry<T>(
  label: string,
  run: () => Promise<T>
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RATE_LIMIT_DELAYS_MS.length; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const details = getErrorDetails(error);
      if (!isRateLimitError(details) || attempt >= RATE_LIMIT_DELAYS_MS.length) {
        throw error;
      }

      const delay = RATE_LIMIT_DELAYS_MS[attempt];
      console.warn(
        `[gemini] ${label} rate limit (tentativa ${attempt + 1}). Aguardando ${delay / 1000}s...`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}

export async function probeGeminiApi(model = "gemini-2.5-flash-lite"): Promise<{
  ok: boolean;
  model: string;
  status?: number;
  googleError?: unknown;
  text?: string;
}> {
  const apiKey = getGeminiApiKey();

  try {
    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: "Responda apenas: OK" }],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 8,
          },
        }),
      }
    );

    const payload = (await response.json()) as {
      error?: { message?: string; code?: number; status?: string; details?: unknown[] };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    if (!response.ok) {
      return {
        ok: false,
        model,
        status: response.status,
        googleError: payload.error ?? payload,
      };
    }

    return {
      ok: true,
      model,
      text: payload.candidates?.[0]?.content?.parts?.[0]?.text,
    };
  } catch (error) {
    return {
      ok: false,
      model,
      googleError: getErrorDetails(error).message,
    };
  }
}

export async function testGeminiConnection(): Promise<{
  ok: boolean;
  model?: string;
  error?: string;
  googleError?: unknown;
  status?: number;
}> {
  const probe = await probeGeminiApi("gemini-2.5-flash-lite");
  if (probe.ok) {
    return { ok: true, model: probe.model };
  }

  return {
    ok: false,
    model: probe.model,
    error:
      typeof probe.googleError === "object" &&
      probe.googleError !== null &&
      "message" in probe.googleError
        ? String((probe.googleError as { message: unknown }).message)
        : String(probe.googleError ?? "Falha ao conectar com Gemini."),
    googleError: probe.googleError,
    status: probe.status,
  };
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

  const transports: Array<{
    transport: "sdk" | "rest";
    run: (modelName: string) => Promise<string>;
  }> = usesAuthKey()
    ? [{ transport: "rest", run: (model) => generateWithGeminiRest(model, options) }]
    : [
        {
          transport: "sdk",
          run: (model) => generateWithGeminiSdk(ai, model, options),
        },
        {
          transport: "rest",
          run: (model) => generateWithGeminiRest(model, options),
        },
      ];

  let lastError: unknown;

  for (const modelName of modelsToTry) {
    for (const attempt of transports) {
      try {
        const text = await runWithRateLimitRetry(
          `${modelName}/${attempt.transport}`,
          () => attempt.run(modelName)
        );

        if (!text.trim()) {
          throw new Error("A IA não retornou conteúdo.");
        }

        return { text, model: modelName };
      } catch (error) {
        const details = getErrorDetails(error);
        if (isAuthError(details)) {
          parseGeminiError(error);
        }
        if (isRateLimitError(details) || isQuotaExhaustedError(details)) {
          lastError = error;
          break;
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
