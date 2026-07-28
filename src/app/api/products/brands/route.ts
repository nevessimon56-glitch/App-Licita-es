import { NextResponse } from "next/server";
import { listUserBrands } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const brands = await listUserBrands(supabase, user.id);
    return NextResponse.json({ brands });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar marcas." },
      { status: 500 }
    );
  }
}
