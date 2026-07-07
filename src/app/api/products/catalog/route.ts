import { NextResponse } from "next/server";
import { listProductCatalog } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  try {
    const products = await listProductCatalog(supabase, user.id, q);
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar produtos." },
      { status: 500 }
    );
  }
}
