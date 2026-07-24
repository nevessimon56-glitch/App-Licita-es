import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  isAdminAuthEnabled,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

export async function requireAdminApiSession() {
  if (!isAdminAuthEnabled()) {
    return {
      error: NextResponse.json(
        { error: "Painel admin não configurado (ADMIN_PASSWORD)." },
        { status: 503 }
      ),
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const valid = await verifyAdminSessionToken(token);

  if (!valid) {
    return {
      error: NextResponse.json({ error: "Não autorizado." }, { status: 401 }),
    };
  }

  return { ok: true as const };
}
