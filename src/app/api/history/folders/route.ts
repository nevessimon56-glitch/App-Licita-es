import { NextResponse } from "next/server";
import { listActiveFolders } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function GET() {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const folders = await listActiveFolders(supabase, user.id);
    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao listar pastas." },
      { status: 500 }
    );
  }
}
