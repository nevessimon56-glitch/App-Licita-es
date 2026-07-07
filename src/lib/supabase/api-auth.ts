import { NextResponse } from "next/server";
import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export async function requireSupabaseApiUser() {
  if (!isSupabaseEnabled()) {
    return {
      error: NextResponse.json(
        { error: "Supabase não configurado." },
        { status: 503 }
      ),
    };
  }

  const user = await getSupabaseUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Não autorizado." }, { status: 401 }),
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: "Supabase indisponível." },
        { status: 503 }
      ),
    };
  }

  return { user, supabase };
}
