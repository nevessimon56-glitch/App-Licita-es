import { NextResponse } from "next/server";
import { getProductPriceStats } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;
  const params = new URL(request.url).searchParams;
  const fabricante = params.get("fabricante")?.trim();
  const marcaModelo = params.get("marcaModelo")?.trim();

  if (!fabricante || !marcaModelo) {
    return NextResponse.json(
      { error: "fabricante e marcaModelo são obrigatórios." },
      { status: 400 }
    );
  }

  try {
    const stats = await getProductPriceStats(
      supabase,
      user.id,
      fabricante,
      marcaModelo
    );
    return NextResponse.json({ stats });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao buscar preços." },
      { status: 500 }
    );
  }
}
