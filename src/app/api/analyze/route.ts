import { NextRequest, NextResponse } from "next/server";
import { analyzeDocuments } from "@/lib/analyze";
import { extractTextFromDocument } from "@/lib/document-extract";
import { isAcceptedFile } from "@/lib/accepted-files";
import { validateFileCount } from "@/lib/file-limits";
import type { UploadedDocument, AnalysisMode, AnalysisResponse } from "@/lib/analysis-prompt";
import { hashDocumentBuffers } from "@/lib/document-hash";
import { getOptionalSupabaseSession } from "@/lib/supabase/optional-auth";
import {
  getCachedAnalysis,
  saveAnalysis,
  setCachedAnalysis,
} from "@/lib/supabase/repository";

export const runtime = "nodejs";
export const maxDuration = 300;

const ALLOWED_TYPES = new Set([
  "edital",
  "termo_referencia",
  "anexo",
  "outro",
]);

function buildAnalysisResponse(
  analysis: string,
  documents: UploadedDocument[],
  mode: AnalysisMode,
  model: string,
  extras: Partial<AnalysisResponse> = {}
): AnalysisResponse {
  return {
    analysis,
    documentSummary: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      charCount: doc.text.length,
    })),
    documents: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      text: doc.text,
      pageCount: doc.pageCount,
    })),
    model,
    mode,
    generatedAt: new Date().toISOString(),
    ...extras,
  };
}

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

    const fileBuffers: { name: string; buffer: Buffer }[] = [];
    const documents: UploadedDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
      fileBuffers.push({ name: file.name, buffer });

      const { text, pageCount } = await extractTextFromDocument(buffer, file.name);
      documents.push({ name: file.name, type, text, pageCount });
    }

    const contentHash = hashDocumentBuffers(fileBuffers, mode);
    const session = await getOptionalSupabaseSession();

    if (session) {
      const cachedMarkdown = await getCachedAnalysis(
        session.supabase,
        session.user.id,
        contentHash,
        mode
      );

      if (cachedMarkdown) {
        const result = buildAnalysisResponse(
          cachedMarkdown,
          documents,
          mode,
          "cache (sem Gemini)",
          {
            fromCache: true,
            autoSaved: false,
          }
        );

        console.info(
          `[analyze:${mode}] cache hit — ${documents.length} arquivo(s) — ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
        );

        return NextResponse.json(result);
      }
    }

    const geminiResult = await analyzeDocuments(documents, mode);

    let savedAnalysisId: string | null = null;
    let savedFolderId: string | null = null;

    if (session) {
      try {
        await setCachedAnalysis(session.supabase, session.user.id, {
          contentHash,
          analysisMode: mode,
          analysisMarkdown: geminiResult.analysis,
          documentNames: documents.map((doc) => doc.name),
        });

        const saved = await saveAnalysis(session.supabase, session.user.id, {
          analysisMarkdown: geminiResult.analysis,
          analysisMode: mode,
          documentNames: documents.map((doc) => doc.name),
          userEmail: session.user.email,
        });
        savedAnalysisId = saved.id;
        savedFolderId = saved.folder_id;
      } catch (saveError) {
        console.error("auto-save analysis failed:", saveError);
      }
    }

    const result: AnalysisResponse = {
      ...geminiResult,
      autoSaved: Boolean(savedAnalysisId),
      savedAnalysisId,
      savedFolderId,
      fromCache: false,
    };

    console.info(
      `[analyze:${mode}] ${documents.length} arquivo(s) — ${((Date.now() - startedAt) / 1000).toFixed(1)}s — modelo ${result.model}${result.autoSaved ? " — auto-saved" : ""}`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro na análise:", error);
    const message =
      error instanceof Error ? error.message : "Erro interno ao processar análise.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
