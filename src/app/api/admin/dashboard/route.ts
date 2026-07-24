import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/supabase/admin-api-auth";
import {
  createSupabaseServiceClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import {
  listAdminAuditLog,
  listAdminUsersSummary,
} from "@/lib/supabase/repository";

export async function GET(request: Request) {
  const auth = await requireAdminApiSession();
  if ("error" in auth && auth.error) return auth.error;

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Configure SUPABASE_SERVICE_ROLE_KEY para o painel admin ver os dados.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "audit";
  const userId = searchParams.get("userId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "100");

  try {
    const supabase = createSupabaseServiceClient();

    if (view === "users") {
      const users = await listAdminUsersSummary(supabase);
      return NextResponse.json({ users });
    }

    const audit = await listAdminAuditLog(supabase, limit, userId);
    return NextResponse.json({ audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no painel admin." },
      { status: 500 }
    );
  }
}
