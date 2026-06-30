import { NextRequest, NextResponse } from "next/server";
import { generatePdfBuffer } from "@/lib/pdf-generate-server";
import { buildProposalExportFilename, buildContentDisposition } from "@/lib/proposal-export-filename";
import {
  buildDeclarationsPdfDefinition,
  buildProposalPdfDefinition,
} from "@/lib/proposal-pdf-document";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ProposalPdfExportBody {
  kind: "proposta" | "declaracoes";
  proposalPackage: ProposalPackage;
  companyProfile: CompanyProfile;
}

function isValidExportBody(body: unknown): body is ProposalPdfExportBody {
  if (!body || typeof body !== "object") return false;
  const candidate = body as ProposalPdfExportBody;
  return (
    (candidate.kind === "proposta" || candidate.kind === "declaracoes") &&
    !!candidate.proposalPackage &&
    typeof candidate.proposalPackage === "object" &&
    !!candidate.companyProfile &&
    typeof candidate.companyProfile === "object" &&
    typeof candidate.proposalPackage.metadata?.orgao === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!isValidExportBody(body)) {
      return NextResponse.json(
        { error: "Dados da proposta inválidos para exportação." },
        { status: 400 }
      );
    }

    const docDefinition =
      body.kind === "proposta"
        ? buildProposalPdfDefinition(body.proposalPackage, body.companyProfile)
        : buildDeclarationsPdfDefinition(body.proposalPackage, body.companyProfile);

    const pdfBuffer = await generatePdfBuffer(docDefinition);
    const filename = `${buildProposalExportFilename(
      body.proposalPackage.metadata.orgao,
      body.kind
    )}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Proposal PDF export error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível gerar o PDF da proposta.",
      },
      { status: 500 }
    );
  }
}
