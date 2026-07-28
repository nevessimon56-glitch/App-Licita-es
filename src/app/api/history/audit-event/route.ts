import { NextResponse } from "next/server";
import { logUserContentAudit } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

const ALLOWED_ACTIONS = new Set([
  "analysis_section_edited",
  "analysis_edited",
  "proposal_generated",
  "proposal_item_added",
  "proposal_item_removed",
  "catalog_applied",
]);

export async function POST(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const body = (await request.json()) as {
      action?: string;
      summary?: string;
      folderId?: string | null;
      folderTitle?: string;
      entityType?: string;
      entityId?: string | null;
      changes?: Record<string, unknown>;
    };

    if (!body.action || !ALLOWED_ACTIONS.has(body.action)) {
      return NextResponse.json({ error: "Ação de auditoria inválida." }, { status: 400 });
    }

    await logUserContentAudit(supabase, user.id, {
      userEmail: user.email,
      folderId: body.folderId,
      folderTitle: body.folderTitle,
      action: body.action,
      entityType: body.entityType,
      entityId: body.entityId ?? undefined,
      summary: body.summary ?? body.action,
      changes: body.changes ?? {},
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao registrar auditoria." },
      { status: 500 }
    );
  }
}
