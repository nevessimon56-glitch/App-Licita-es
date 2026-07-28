import { NextRequest, NextResponse } from "next/server";
import { chatAboutLicitacao } from "@/lib/chat";
import type { ChatMessage } from "@/lib/analysis-prompt";
import { getOptionalSupabaseSession } from "@/lib/supabase/optional-auth";
import { logUserContentAudit } from "@/lib/supabase/repository";
import { previewText } from "@/lib/text-change-summary";
import { enforceApiRateLimit } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getOptionalSupabaseSession();
    const rateLimited = enforceApiRateLimit(
      request,
      "chat",
      80,
      60 * 60 * 1000,
      session?.user.id
    );
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const analysis = body.analysis as string | undefined;
    const documents = body.documents as
      | { name: string; type: string; text: string }[]
      | undefined;
    const folderId = body.folderId as string | null | undefined;
    const folderTitle = body.folderTitle as string | undefined;
    const analysisId = body.analysisId as string | null | undefined;

    if (!Array.isArray(messages) || !messages.length) {
      return NextResponse.json(
        { error: "Envie pelo menos uma mensagem." },
        { status: 400 }
      );
    }

    const result = await chatAboutLicitacao({
      messages,
      analysis,
      documents,
    });

    if (session) {
      const userMessages = messages.filter((message) => message.role === "user");
      const pergunta = userMessages[userMessages.length - 1]?.content?.trim() ?? "";

      if (pergunta) {
        await logUserContentAudit(session.supabase, session.user.id, {
          userEmail: session.user.email,
          folderId: folderId ?? null,
          folderTitle: folderTitle ?? "",
          action: "chat_message",
          entityType: "chat",
          entityId: analysisId ?? undefined,
          summary: `Chat: ${previewText(pergunta, 120)}`,
          changes: {
            pergunta,
            pergunta_preview: previewText(pergunta, 500),
            resposta: result.reply,
            resposta_preview: previewText(result.reply, 800),
            modelo: result.model,
            mensagem_numero: userMessages.length,
            total_mensagens_conversa: messages.length + 1,
            documentos:
              documents?.map((doc) => doc.name).filter(Boolean).slice(0, 10) ?? [],
          },
        });
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro no chat:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno no chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
