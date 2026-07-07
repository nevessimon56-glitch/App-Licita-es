import { NextResponse } from "next/server";
import { saveAnalysis } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  const { data, error } = await supabase
    .from("user_analyses")
    .select("id, title, orgao, objeto, numero_pregao, processo, analysis_mode, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analyses: data ?? [] });
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
    });

    return NextResponse.json({ analysis });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao salvar análise." },
      { status: 500 }
    );
  }
}
