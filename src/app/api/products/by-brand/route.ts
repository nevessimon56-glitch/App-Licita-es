import { NextResponse } from "next/server";
import { listProductsByBrand } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;
  const fabricante = new URL(request.url).searchParams.get("fabricante")?.trim();

  if (!fabricante) {
    return NextResponse.json({ error: "fabricante é obrigatório." }, { status: 400 });
  }

  try {
    const products = await listProductsByBrand(supabase, user.id, fabricante);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar produtos." },
      { status: 500 }
    );
  }
}
