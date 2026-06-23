import { NextRequest, NextResponse } from "next/server";
import { chatAboutLicitacao } from "@/lib/chat";
import type { ChatMessage } from "@/lib/analysis-prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const analysis = body.analysis as string | undefined;
    const documents = body.documents as
      | { name: string; type: string; text: string }[]
      | undefined;

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

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro no chat:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno no chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
