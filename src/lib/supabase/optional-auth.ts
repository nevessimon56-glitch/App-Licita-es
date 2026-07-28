import { createSupabaseServerClient, getSupabaseUser } from "@/lib/supabase/server";
import { isSupabaseEnabled } from "@/lib/supabase/config";

export async function getOptionalSupabaseSession() {
  if (!isSupabaseEnabled()) return null;

  const user = await getSupabaseUser();
  if (!user) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  return { user, supabase };
}
