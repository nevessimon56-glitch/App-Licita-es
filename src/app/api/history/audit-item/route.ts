import { NextResponse } from "next/server";
import { logItemFieldEdit } from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";

export async function POST(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const body = (await request.json()) as {
      folderId?: string | null;
      folderTitle?: string;
      proposalId?: string | null;
      itemNumero?: string;
      itemTitulo?: string;
      field?: string;
      oldValue?: string;
      newValue?: string;
    };

    if (!body.field || body.itemNumero === undefined) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }

    await logItemFieldEdit(supabase, user.id, {
      userEmail: user.email,
      folderId: body.folderId,
      folderTitle: body.folderTitle,
      proposalId: body.proposalId,
      itemNumero: body.itemNumero,
      itemTitulo: body.itemTitulo ?? "",
      field: body.field,
      oldValue: String(body.oldValue ?? ""),
      newValue: String(body.newValue ?? ""),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao registrar alteração." },
      { status: 500 }
    );
  }
}
