import { NextRequest, NextResponse } from "next/server";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { buildExportFilename } from "@/lib/document-parser";
import { buildContentDisposition } from "@/lib/proposal-export-filename";
import { buildPdfDocumentDefinition } from "@/lib/pdf-document";
import { generatePdfBuffer } from "@/lib/pdf-generate-server";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidAnalysisResponse(body: unknown): body is AnalysisResponse {
  if (!body || typeof body !== "object") return false;
  const candidate = body as AnalysisResponse;
  return (
    typeof candidate.analysis === "string" &&
    candidate.analysis.length > 0 &&
    Array.isArray(candidate.documentSummary) &&
    typeof candidate.generatedAt === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isValidAnalysisResponse(body)) {
      return NextResponse.json(
        { error: "Dados da análise inválidos para exportação." },
        { status: 400 }
      );
    }

    const docDefinition = buildPdfDocumentDefinition(body);
    const pdfBuffer = await generatePdfBuffer(docDefinition);

    const prefix =
      body.mode === "resumido" ? "resumo-edital-resumido" : "resumo-edital-completo";
    const filename = `${buildExportFilename(prefix)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o PDF. Tente exportar em Word.",
      },
      { status: 500 }
    );
  }
}
