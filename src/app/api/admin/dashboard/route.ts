import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/supabase/admin-api-auth";
import {
  createSupabaseServiceClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";
import {
  getAdminDashboardStats,
  listAdminArchivedFolders,
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
  const search = searchParams.get("search") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  try {
    const supabase = createSupabaseServiceClient();

    if (view === "stats") {
      const stats = await getAdminDashboardStats(supabase);
      return NextResponse.json({ stats });
    }

    if (view === "users") {
      const users = await listAdminUsersSummary(supabase);
      return NextResponse.json({ users });
    }

    if (view === "archived") {
      const archived = await listAdminArchivedFolders(supabase, limit, offset);
      return NextResponse.json(archived);
    }

    const audit = await listAdminAuditLog(supabase, {
      limit,
      offset,
      userId,
      search,
    });
    return NextResponse.json(audit);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no painel admin." },
      { status: 500 }
    );
  }
}
