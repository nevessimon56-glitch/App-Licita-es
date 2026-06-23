import {
  ANALYSIS_SECTIONS,
  getPromptForMode,
  SUMMARY_SECTIONS,
  type AnalysisMode,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { generateWithGemini, ANALYSIS_MODELS, getAnalysisModel } from "./gemini";
import { buildDocumentContext, validateDocuments } from "./pdf";

const MAX_CHAT_DOC_CHARS = 80_000;

const FULL_REQUIRED_MARKERS = [
  "## Informações Gerais",
  "## Itens e Equipamentos",
  "## Instalação e Serviços",
  "## Habilitação",
  "## Checklist para Participação",
] as const;

const SUMMARY_REQUIRED_MARKERS = [
  "## Informações Gerais",
  "## Itens do Pregão",
  "## Entrega",
  "## Qualificação Técnica",
  "## Valores",
] as const;

const FORBIDDEN_IN_SUMMARY = [
  "## Penalidades",
  "## Obrigações Contratuais",
  "## Pontos de Atenção",
  "## Checklist",
  "## Análise para o Fornecedor",
  "## Habilitação",
] as const;

function isAnalysisIncomplete(analysis: string, mode: AnalysisMode): boolean {
  const markers =
    mode === "resumido" ? SUMMARY_REQUIRED_MARKERS : FULL_REQUIRED_MARKERS;
  const minLength = mode === "resumido" ? 1500 : 3000;
  const minTables = mode === "resumido" ? 5 : 8;

  if (analysis.length < minLength) return true;

  for (const marker of markers) {
    if (!analysis.includes(marker)) return true;
  }

  if (/## Informações Gerais\s*\n\s*## /m.test(analysis)) return true;

  const tableRows = (analysis.match(/\|[^|]+\|[^|]+\|/g) ?? []).length;
  if (tableRows < minTables) return true;

  if (mode === "resumido") {
    for (const forbidden of FORBIDDEN_IN_SUMMARY) {
      if (analysis.includes(forbidden)) return true;
    }
  }

  return false;
}

function buildUserMessage(
  documents: UploadedDocument[],
  context: string,
  mode: AnalysisMode
): string {
  const modeLabel = mode === "resumido" ? "RESUMIDO" : "COMPLETO";
  const extraRules =
    mode === "resumido"
      ? `
REGRAS DA VERSÃO RESUMIDA:
- Não inclua Penalidades, Obrigações Contratuais, Pontos de Atenção, Checklist ou Análise para o Fornecedor.
- Qualificação técnica aparece UMA vez só, na seção dedicada.
- ME/EPP e locais de entrega: na tabela de itens e/ou Informações Gerais — sem repetir.
- Encerre após a seção Valores.`
      : `
REGRAS DA VERSÃO COMPLETA:
- Preencha TODAS as tabelas, linha por linha.
- Não pare antes da seção "## Checklist para Participação".`;

  return `Analise os documentos e produza o resumo executivo ${modeLabel} conforme as instruções.
${extraRules}
- Não repita o órgão como seção isolada após o cabeçalho.

DOCUMENTOS FORNECIDOS (${documents.length} arquivo(s)):
${documents.map((d) => `- ${d.name} [${d.type}] — ${d.pageCount} páginas`).join("\n")}

IMPORTANTE: analise TODOS os arquivos em conjunto. Especificações de itens/equipamentos podem estar no Termo de Referência ou em anexos, não apenas no edital.

${context}`;
}

export async function analyzeDocuments(
  documents: UploadedDocument[],
  mode: AnalysisMode = "completo"
): Promise<AnalysisResponse> {
  const validationError = validateDocuments(documents);
  if (validationError) {
    throw new Error(validationError);
  }

  const context = buildDocumentContext(documents);
  const systemPrompt = getPromptForMode(mode);
  const baseUserMessage = buildUserMessage(documents, context, mode);
  const sections =
    mode === "resumido" ? SUMMARY_SECTIONS : ANALYSIS_SECTIONS;

  const models = [
    getAnalysisModel(),
    ...ANALYSIS_MODELS.filter((m) => m !== getAnalysisModel()),
  ];

  const maxTokens = mode === "resumido" ? 10_000 : 24_000;
  const retryMaxTokens = mode === "resumido" ? 12_000 : 28_000;

  let analysis = "";
  let model = getAnalysisModel();

  const first = await generateWithGemini({
    systemInstruction: systemPrompt,
    userMessage: baseUserMessage,
    temperature: mode === "resumido" ? 0.1 : 0.15,
    maxOutputTokens: maxTokens,
    models,
  });
  analysis = first.text;
  model = first.model;

  if (isAnalysisIncomplete(analysis, mode)) {
    console.warn(`[analyze:${mode}] Resposta incompleta, tentando novamente...`);

    const retry = await generateWithGemini({
      systemInstruction: systemPrompt,
      userMessage: `${baseUserMessage}

ATENÇÃO: A tentativa anterior foi REJEITADA (incompleta${
        mode === "resumido" ? " ou com seções proibidas/repetidas" : ""
      }).
Reescreva do zero. Seções obrigatórias:
${sections.map((s) => `- ${s}`).join("\n")}
${
  mode === "resumido"
    ? "\nNÃO inclua: Penalidades, Obrigações Contratuais, Pontos de Atenção, Checklist, Habilitação jurídica/fiscal."
    : ""
}`,
      temperature: 0.1,
      maxOutputTokens: retryMaxTokens,
      models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    });

    if (!isAnalysisIncomplete(retry.text, mode) || retry.text.length > analysis.length) {
      analysis = retry.text;
      model = retry.model;
    }
  }

  return {
    analysis,
    mode,
    documentSummary: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      charCount: doc.text.length,
    })),
    documents: documents.map((doc) => ({
      name: doc.name,
      type: doc.type,
      pageCount: doc.pageCount,
      text:
        doc.text.length > MAX_CHAT_DOC_CHARS
          ? doc.text.slice(0, MAX_CHAT_DOC_CHARS) +
            "\n\n[... texto truncado para contexto do chat ...]"
          : doc.text,
    })),
    model,
    generatedAt: new Date().toISOString(),
  };
}
