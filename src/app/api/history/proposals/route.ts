import { NextResponse } from "next/server";
import {
  listRecentProposals,
  saveProposal,
} from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";
import type { ProposalPackage } from "@/lib/proposal-types";

export async function GET() {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const proposals = await listRecentProposals(supabase, user.id);
    return NextResponse.json({ proposals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar propostas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const body = (await request.json()) as {
      analysisId?: string | null;
      companyId?: string;
      pkg?: ProposalPackage;
      proposalId?: string;
    };

    if (!body.pkg) {
      return NextResponse.json({ error: "pkg é obrigatório." }, { status: 400 });
    }

    const proposal = await saveProposal(supabase, user.id, {
      analysisId: body.analysisId ?? null,
      companyId: body.companyId ?? "torquato-filial-palmas",
      pkg: body.pkg,
      proposalId: body.proposalId,
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar proposta." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const body = (await request.json()) as {
      proposalId?: string;
      analysisId?: string | null;
      companyId?: string;
      pkg?: ProposalPackage;
    };

    if (!body.proposalId || !body.pkg) {
      return NextResponse.json(
        { error: "proposalId e pkg são obrigatórios." },
        { status: 400 }
      );
    }

    const proposal = await saveProposal(supabase, user.id, {
      proposalId: body.proposalId,
      analysisId: body.analysisId ?? null,
      companyId: body.companyId ?? "torquato-filial-palmas",
      pkg: body.pkg,
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao atualizar proposta." },
      { status: 500 }
    );
  }
}
