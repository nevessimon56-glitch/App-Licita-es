import { NextRequest, NextResponse } from "next/server";
import { generateProposalPackage } from "@/lib/proposal-generate";
import type { ProposalGenerateRequest } from "@/lib/proposal-types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as ProposalGenerateRequest;

    if (!body.analysis?.trim()) {
      return NextResponse.json(
        { error: "Gere o resumo do edital antes de elaborar a proposta." },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.documents) || !body.documents.length) {
      return NextResponse.json(
        { error: "Documentos originais não encontrados para gerar a proposta." },
        { status: 400 }
      );
    }

    const result = await generateProposalPackage(body);

    console.info(
      `[proposal] gerado em ${((Date.now() - startedAt) / 1000).toFixed(1)}s — modelo ${result.package.model} — ${result.package.itens.length} item(ns)`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na geração da proposta:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao gerar proposta e declarações.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
