import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServiceClient, isSupabaseServiceRoleConfigured } from "@/lib/supabase/admin";
import { getGeminiApiKey, testGeminiConnection } from "@/lib/gemini";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const testGemini = new URL(request.url).searchParams.get("testGemini") === "1";

  const checks = {
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    supabase: isSupabaseEnabled(),
    supabaseServiceRole: isSupabaseServiceRoleConfigured(),
    admin: Boolean(process.env.ADMIN_PASSWORD?.trim()),
  };

  let supabaseReachable: boolean | null = null;
  let geminiReachable: boolean | null = null;
  let geminiModel: string | undefined;
  let geminiError: string | undefined;
  let geminiGoogleError: unknown;
  let geminiHttpStatus: number | undefined;
  let geminiKeyType: "auth" | "standard" | "missing" = "missing";

  if (checks.gemini) {
    const key = getGeminiApiKey();
    geminiKeyType = key.startsWith("AQ.") ? "auth" : "standard";
    if (testGemini) {
      const geminiTest = await testGeminiConnection();
      geminiReachable = geminiTest.ok;
      geminiModel = geminiTest.model;
      geminiError = geminiTest.error;
      geminiGoogleError = geminiTest.googleError;
      geminiHttpStatus = geminiTest.status;
    }
  }

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
    (!testGemini || geminiReachable === true) &&
    (!checks.supabase || (checks.supabaseServiceRole && supabaseReachable !== false));

  return Response.json(
    {
      ok,
      checks: {
        ...checks,
        geminiReachable,
        geminiModel,
        geminiKeyType,
        geminiError,
        geminiGoogleError,
        geminiHttpStatus,
        supabaseReachable,
      },
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 }
  );
}
