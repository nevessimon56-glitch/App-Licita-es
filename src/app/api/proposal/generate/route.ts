import { NextRequest, NextResponse } from "next/server";
import { generateProposalPackage } from "@/lib/proposal-generate";
import type { ProposalGenerateRequest } from "@/lib/proposal-types";
import { getOptionalSupabaseSession } from "@/lib/supabase/optional-auth";
import {
  logUserContentAudit,
  saveProposal,
} from "@/lib/supabase/repository";
import { buildAnalysisEditAudit } from "@/lib/analysis-edit-audit";
import { enforceApiRateLimit } from "@/lib/api-rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const session = await getOptionalSupabaseSession();
    const rateLimited = enforceApiRateLimit(
      request,
      "proposal",
      20,
      60 * 60 * 1000,
      session?.user.id
    );
    if (rateLimited) return rateLimited;

    const body = (await request.json()) as ProposalGenerateRequest & {
      analysisId?: string | null;
      folderId?: string | null;
      proposalId?: string | null;
      originalAnalysis?: string;
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

    const analysisEditAudit =
      body.originalAnalysis && body.originalAnalysis.trim() !== body.analysis.trim()
        ? buildAnalysisEditAudit(body.originalAnalysis, body.analysis)
        : null;

    if (session) {
      await logUserContentAudit(session.supabase, session.user.id, {
        userEmail: session.user.email,
        folderId: body.folderId,
        action: "proposal_generated",
        entityType: "proposal",
        entityId: body.proposalId ?? undefined,
        summary: `Gerou proposta (${result.package.itens.length} item(ns))`,
        changes: {
          modelo_ia: result.package.model,
          itens_gerados: result.package.itens.length,
          empresa: body.companyProfile?.id,
          resumo_foi_editado: Boolean(analysisEditAudit),
          ...(analysisEditAudit
            ? {
                secoes_alteradas_count: analysisEditAudit.secoes_alteradas_count,
                linhas_adicionadas: analysisEditAudit.lines_added,
                linhas_removidas: analysisEditAudit.lines_removed,
              }
            : {}),
        },
      });
    }

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
