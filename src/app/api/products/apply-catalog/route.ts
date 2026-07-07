import { NextResponse } from "next/server";
import {
  applyCatalogToItem,
  findCatalogMatches,
} from "@/lib/supabase/repository";
import { requireSupabaseApiUser } from "@/lib/supabase/api-auth";
import type { ProposalItem } from "@/lib/proposal-types";

export async function POST(request: Request) {
  const auth = await requireSupabaseApiUser();
  if ("error" in auth && auth.error) return auth.error;

  const { supabase, user } = auth as Exclude<typeof auth, { error: NextResponse }>;

  try {
    const body = (await request.json()) as { itens?: ProposalItem[] };
    if (!Array.isArray(body.itens)) {
      return NextResponse.json({ error: "itens é obrigatório." }, { status: 400 });
    }

    const itens = await Promise.all(
      body.itens.map(async (item) => {
        const match = await findCatalogMatches(supabase, user.id, item);
        return match ? applyCatalogToItem(item, match) : item;
      })
    );

    return NextResponse.json({ itens });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao aplicar catálogo." },
      { status: 500 }
    );
  }
}
