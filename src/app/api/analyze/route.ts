import { NextRequest, NextResponse } from "next/server";
import { analyzeDocuments } from "@/lib/analyze";
import { extractTextFromDocument } from "@/lib/document-extract";
import { isAcceptedFile } from "@/lib/accepted-files";
import { validateFileCount } from "@/lib/file-limits";
import type { UploadedDocument, AnalysisMode } from "@/lib/analysis-prompt";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TYPES = new Set([
  "edital",
  "termo_referencia",
  "anexo",
  "outro",
]);

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

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

    const countError = validateFileCount(files.length);
    if (countError) {
      return NextResponse.json({ error: countError }, { status: 400 });
    }

    const rawMode = (formData.get("mode") as string) ?? "completo";
    const mode: AnalysisMode =
      rawMode === "resumido" ? "resumido" : "completo";

    const documents: UploadedDocument[] = await Promise.all(
      files.map(async (file, i) => {
        const rawType = types[i] ?? "outro";
        const type = ALLOWED_TYPES.has(rawType)
          ? (rawType as UploadedDocument["type"])
          : "outro";

        if (!isAcceptedFile(file.name)) {
          throw new Error(
            `Arquivo "${file.name}" não é suportado. Use PDF, DOC ou DOCX.`
          );
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const { text, pageCount } = await extractTextFromDocument(
          buffer,
          file.name
        );

        return { name: file.name, type, text, pageCount };
      })
    );

    const result = await analyzeDocuments(documents, mode);

    console.info(
      `[analyze:${mode}] ${documents.length} arquivo(s) — ${((Date.now() - startedAt) / 1000).toFixed(1)}s — modelo ${result.model}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na análise:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao processar análise.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
