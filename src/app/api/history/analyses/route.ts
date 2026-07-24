import { NextResponse } from "next/server";
import { saveAnalysis, listRecentAnalyses } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const analyses = await listRecentAnalyses(supabase, user.id);
    return NextResponse.json({ analyses });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar análises." },
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
      title?: string;
      analysisMarkdown?: string;
      analysisMode?: string;
      documentNames?: string[];
      orgao?: string;
      objeto?: string;
      numeroPregao?: string;
      processo?: string;
      folderId?: string | null;
    };

    if (!body.analysisMarkdown?.trim()) {
      return NextResponse.json(
        { error: "analysisMarkdown é obrigatório." },
        { status: 400 }
      );
    }

    const analysis = await saveAnalysis(supabase, user.id, {
      title: body.title,
      analysisMarkdown: body.analysisMarkdown,
      analysisMode: body.analysisMode ?? "completo",
      documentNames: body.documentNames ?? [],
      orgao: body.orgao,
      objeto: body.objeto,
      numeroPregao: body.numeroPregao,
      processo: body.processo,
      folderId: body.folderId,
      userEmail: user.email,
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar análise." },
      { status: 500 }
    );
  }
}
