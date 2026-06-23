import {
  ANALYSIS_SYSTEM_PROMPT,
  ANALYSIS_SECTIONS,
  type AnalysisResponse,
  type UploadedDocument,
} from "./analysis-prompt";
import { generateWithGemini, ANALYSIS_MODELS, getAnalysisModel } from "./gemini";
import { buildDocumentContext, validateDocuments } from "./pdf";

const MAX_CHAT_DOC_CHARS = 80_000;

const REQUIRED_MARKERS = [
  "## Informações Gerais",
  "## Itens e Equipamentos",
  "## Instalação e Serviços",
  "## Habilitação",
  "## Checklist para Participação",
] as const;

function isAnalysisIncomplete(analysis: string): boolean {
  if (analysis.length < 3000) return true;

  for (const marker of REQUIRED_MARKERS) {
    if (!analysis.includes(marker)) return true;
  }

  // Seção Informações Gerais vazia (título seguido de outra seção)
  if (/## Informações Gerais\s*\n\s*## /m.test(analysis)) return true;

  // Sem tabelas = resposta provavelmente cortada ou preguiçosa
  const tableRows = (analysis.match(/\|[^|]+\|[^|]+\|/g) ?? []).length;
  if (tableRows < 8) return true;

  return false;
}

export async function analyzeDocuments(
  documents: UploadedDocument[]
): Promise<AnalysisResponse> {
  const validationError = validateDocuments(documents);
  if (validationError) {
    throw new Error(validationError);
  }

  const context = buildDocumentContext(documents);

  const baseUserMessage = `Analise integralmente os documentos abaixo e produza o resumo executivo COMPLETO conforme as instruções.

REQUISITOS CRÍTICOS:
- Preencha TODAS as tabelas, linha por linha.
- Não pare antes da seção "## Checklist para Participação".
- Não repita o órgão como seção isolada após o cabeçalho.

DOCUMENTOS FORNECIDOS (${documents.length} arquivo(s)):
${documents.map((d) => `- ${d.name} [${d.type}] — ${d.pageCount} páginas`).join("\n")}

${context}`;

  const models = [
    getAnalysisModel(),
    ...ANALYSIS_MODELS.filter((m) => m !== getAnalysisModel()),
  ];

  let analysis = "";
  let model = getAnalysisModel();

  // Primeira tentativa
  const first = await generateWithGemini({
    systemInstruction: ANALYSIS_SYSTEM_PROMPT,
    userMessage: baseUserMessage,
    temperature: 0.15,
    maxOutputTokens: 24_000,
    models,
  });
  analysis = first.text;
  model = first.model;

  // Retry se incompleto — pede reescrita completa
  if (isAnalysisIncomplete(analysis)) {
    console.warn("[analyze] Resposta incompleta, tentando novamente...");

    const retry = await generateWithGemini({
      systemInstruction: ANALYSIS_SYSTEM_PROMPT,
      userMessage: `${baseUserMessage}

ATENÇÃO: A tentativa anterior foi REJEITADA por estar INCOMPLETA ou sem tabelas preenchidas.
Reescreva o resumo INTEIRO do zero. Comece pelo título e gere TODAS as seções:
${ANALYSIS_SECTIONS.map((s) => `- ${s}`).join("\n")}

Cada seção DEVE ter tabela ou bullets preenchidos. Não omita nenhuma seção.`,
      temperature: 0.1,
      maxOutputTokens: 28_000,
      models: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
    });

    if (!isAnalysisIncomplete(retry.text) || retry.text.length > analysis.length) {
      analysis = retry.text;
      model = retry.model;
    }
  }

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
