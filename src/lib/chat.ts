import {
  CHAT_SYSTEM_PROMPT,
  type ChatMessage,
} from "./analysis-prompt";
import { generateWithGemini } from "./gemini";

interface ChatDocument {
  name: string;
  type: string;
  text: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  analysis?: string;
  documents?: ChatDocument[];
}

const MAX_CONTEXT_CHARS = 100_000;

function buildChatContext(analysis?: string, documents?: ChatDocument[]): string {
  const parts: string[] = [];

  if (analysis?.trim()) {
    parts.push("=== RESUMO EXECUTIVO GERADO ===\n\n" + analysis);
  }

  if (documents?.length) {
    let totalChars = parts.join("").length;

    for (const doc of documents) {
      const header = `\n\n=== DOCUMENTO: ${doc.name} [${doc.type}] ===\n\n`;
      const remaining = MAX_CONTEXT_CHARS - totalChars - header.length;
      if (remaining <= 500) break;

      const text =
        doc.text.length > remaining
          ? doc.text.slice(0, remaining) + "\n\n[... truncado ...]"
          : doc.text;

      parts.push(header + text);
      totalChars += header.length + text.length;
    }
  }

  return parts.join("");
}

export async function chatAboutLicitacao(
  request: ChatRequest
): Promise<{ reply: string; model: string }> {
  const { messages, analysis, documents } = request;

  if (!messages.length) {
    throw new Error("Nenhuma mensagem enviada.");
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    throw new Error("A última mensagem deve ser do usuário.");
  }

  if (!analysis?.trim() && !documents?.length) {
    throw new Error(
      "Faça a análise do edital antes de usar o chat, para que o assistente tenha contexto."
    );
  }

  const context = buildChatContext(analysis, documents);

  const systemInstruction = `${CHAT_SYSTEM_PROMPT}

--- CONTEXTO DA LICITAÇÃO (fonte exclusiva para suas respostas) ---

${context}`;

  const history = messages.slice(0, -1).map((msg) => ({
    role: msg.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: msg.content }] as [{ text: string }],
  }));

  const { text, model } = await generateWithGemini({
    systemInstruction,
    userMessage: lastMessage.content,
    temperature: 0.3,
    history: history.length ? history : undefined,
  });

  return { reply: text, model };
}
