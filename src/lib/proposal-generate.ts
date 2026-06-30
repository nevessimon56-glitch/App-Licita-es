import { DEFAULT_COMPANY_PROFILE } from "./company-defaults";
import { generateWithGemini } from "./gemini";
import { extractJsonFromModelResponse, normalizeProposalPackage } from "./proposal-parse";
import { PROPOSAL_SYSTEM_PROMPT } from "./proposal-prompt";
import type { CompanyProfile, ProposalGenerateRequest, ProposalPackage } from "./proposal-types";

const MAX_DOC_CHARS = 120_000;

function buildDocumentContext(
  documents: ProposalGenerateRequest["documents"]
): string {
  const perDocBudget = Math.max(
    8_000,
    Math.floor(MAX_DOC_CHARS / Math.max(documents.length, 1))
  );

  return documents
    .map((doc) => {
      const text =
        doc.text.length > perDocBudget
          ? `${doc.text.slice(0, perDocBudget)}\n\n[... texto truncado ...]`
          : doc.text;
      return `--- ${doc.name} [${doc.type}] ---\n${text}`;
    })
    .join("\n\n");
}

export async function generateProposalPackage(
  request: ProposalGenerateRequest
): Promise<{ package: ProposalPackage; companyProfile: CompanyProfile }> {
  if (!request.analysis?.trim()) {
    throw new Error("É necessário gerar o resumo antes da proposta.");
  }

  const companyProfile: CompanyProfile = {
    ...DEFAULT_COMPANY_PROFILE,
    ...request.companyProfile,
  };

  const context = buildDocumentContext(request.documents);

  const userMessage = `Com base no RESUMO EXECUTIVO, edital, termo de referência e anexos abaixo, gere o JSON da proposta e declarações.

RESUMO EXECUTIVO JÁ GERADO:
${request.analysis}

DOCUMENTOS ORIGINAIS (${request.documents.length} arquivo(s)):
${context}

DADOS DA EMPRESA FORNECEDORA (usar nas declarações quando aplicável):
- Razão social: ${companyProfile.razaoSocial}
- CNPJ: ${companyProfile.cnpj}
- IE: ${companyProfile.inscricaoEstadual}
- Endereço: ${companyProfile.endereco}, ${companyProfile.municipio}-${companyProfile.estado}, CEP ${companyProfile.cep}
- Representante: ${companyProfile.representanteNome}, RG ${companyProfile.representanteRg}, CPF ${companyProfile.representanteCpf}

Foque nos itens de ar condicionado e equipamentos correlatos. Mantenha descrições técnicas fiéis ao edital em texto corrido maiúsculo.`;

  const { text, model } = await generateWithGemini({
    systemInstruction: PROPOSAL_SYSTEM_PROMPT,
    userMessage,
    temperature: 0.1,
    maxOutputTokens: 28_000,
    models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"],
  });

  const raw = extractJsonFromModelResponse(text);
  const proposalPackage = normalizeProposalPackage(raw, model, companyProfile);

  return { package: proposalPackage, companyProfile };
}
