import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServiceClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    supabase: isSupabaseEnabled(),
    supabaseServiceRole: isSupabaseServiceRoleConfigured(),
    admin: Boolean(process.env.ADMIN_PASSWORD?.trim()),
  };

  let supabaseReachable: boolean | null = null;

  if (checks.supabase && checks.supabaseServiceRole) {
    try {
      const supabase = createSupabaseServiceClient();
      const { error } = await supabase.from("profiles").select("id").limit(1);
      supabaseReachable = !error;
    } catch {
      supabaseReachable = false;
    }
  }

  const ok =
    checks.gemini &&
    (!checks.supabase || (checks.supabaseServiceRole && supabaseReachable !== false));

  return Response.json(
    {
      ok,
      checks: {
        ...checks,
        supabaseReachable,
      },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
