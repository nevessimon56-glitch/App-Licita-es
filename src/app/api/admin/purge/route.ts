import { NextResponse } from "next/server";
import { requireAdminApiSession } from "@/lib/supabase/admin-api-auth";
import {
  createSupabaseServiceClient,
  isSupabaseServiceRoleConfigured,
} from "@/lib/supabase/admin";

export async function POST() {
  const auth = await requireAdminApiSession();
  if ("error" in auth && auth.error) return auth.error;

  if (!isSupabaseServiceRoleConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY não configurada." },
      { status: 503 }
    );
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.rpc("purge_expired_user_data");

    if (error) throw new Error(error.message);

    return NextResponse.json({
      ok: true,
      purgedFolders: typeof data === "number" ? data : 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao executar limpeza de dados expirados.",
      },
      { status: 500 }
    );
  }
}
