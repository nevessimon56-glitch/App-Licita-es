import { NextRequest, NextResponse } from "next/server";
import { generateProposalPackage } from "@/lib/proposal-generate";
import type { ProposalGenerateRequest } from "@/lib/proposal-types";
import { getOptionalSupabaseSession } from "@/lib/supabase/optional-auth";
import { saveProposal } from "@/lib/supabase/repository";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as ProposalGenerateRequest & {
      analysisId?: string | null;
      folderId?: string | null;
      proposalId?: string | null;
    };

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

    let savedProposalId: string | null = null;
    let savedFolderId: string | null = body.folderId ?? null;
    let autoSaved = false;

    const session = await getOptionalSupabaseSession();
    if (session && body.companyProfile?.id) {
      try {
        const saved = await saveProposal(session.supabase, session.user.id, {
          analysisId: body.analysisId ?? null,
          companyId: body.companyProfile.id,
          pkg: result.package,
          folderId: body.folderId,
          proposalId: body.proposalId ?? undefined,
          userEmail: session.user.email,
        });
        savedProposalId = saved.id;
        savedFolderId = saved.folder_id;
        autoSaved = true;
      } catch (saveError) {
        console.error("auto-save proposal failed:", saveError);
      }
    }

    console.info(
      `[proposal] gerado em ${((Date.now() - startedAt) / 1000).toFixed(1)}s — modelo ${result.package.model} — ${result.package.itens.length} item(ns)${autoSaved ? " — auto-saved" : ""}`
    );

    return NextResponse.json({
      ...result,
      autoSaved,
      savedProposalId,
      savedFolderId,
    });
  } catch (error) {
    console.error("Erro na geração da proposta:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erro interno ao gerar proposta e declarações.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
