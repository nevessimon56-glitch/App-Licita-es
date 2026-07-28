import { NextRequest, NextResponse } from "next/server";
import { chatAboutLicitacao } from "@/lib/chat";
import type { ChatMessage } from "@/lib/analysis-prompt";
import { getOptionalSupabaseSession } from "@/lib/supabase/optional-auth";
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
