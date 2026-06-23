import { NextRequest, NextResponse } from "next/server";
import { analyzeDocuments } from "@/lib/analyze";
import { extractTextFromPdf } from "@/lib/pdf";
import type { UploadedDocument } from "@/lib/analysis-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TYPES = new Set([
  "edital",
  "termo_referencia",
  "anexo",
  "outro",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const types = formData.getAll("types") as string[];

    if (!files.length) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const documents: UploadedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rawType = types[i] ?? "outro";
      const type = ALLOWED_TYPES.has(rawType)
        ? (rawType as UploadedDocument["type"])
        : "outro";

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json(
          { error: `Arquivo "${file.name}" não é PDF. Apenas PDFs são aceitos.` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { text, pageCount } = await extractTextFromPdf(buffer);

      documents.push({
        name: file.name,
        type,
        text,
        pageCount,
      });
    }

    const result = await analyzeDocuments(documents);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na análise:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao processar análise.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
