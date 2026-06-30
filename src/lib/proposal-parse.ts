import { applyStandardProposalPackage } from "./proposal-template";
import type { ProposalPackage } from "./proposal-types";

export function extractJsonFromModelResponse(text: string): unknown {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  return JSON.parse(trimmed);
}

function asString(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(String(value).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(num) ? num : null;
}

function asBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (value === "false" || value === "0") return false;
  return fallback;
}

export function normalizeProposalPackage(
  raw: unknown,
  model: string,
  company?: Parameters<typeof applyStandardProposalPackage>[1]
): ProposalPackage {
  const data = (raw ?? {}) as Record<string, unknown>;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const condicoes = (data.condicoesComerciais ?? {}) as Record<string, unknown>;

  const itens = Array.isArray(data.itens)
    ? data.itens.map((item, index) => {
        const row = item as Record<string, unknown>;
        return {
          numero: asString(row.numero, String(index + 1)),
          unidade: asString(row.unidade, "UND"),
          codigo: asString(row.codigo),
          tituloProduto: asString(row.tituloProduto),
          descricao: asString(row.descricao).toUpperCase(),
          descricaoComplementar: asString(row.descricaoComplementar).toUpperCase(),
          quantidade: Number(row.quantidade) || 1,
          fabricante: asString(row.fabricante),
          marcaModelo: asString(row.marcaModelo),
          semInstalacao: asBoolean(row.semInstalacao, true),
          valorUnitario: asNumberOrNull(row.valorUnitario),
          valorTotal: asNumberOrNull(row.valorTotal),
        };
      })
    : [];

  const checklist = Array.isArray(data.checklist)
    ? data.checklist.map((entry) => {
        const row = entry as Record<string, unknown>;
        return {
          categoria: asString(row.categoria, "Documentos"),
          item: asString(row.item),
          requisitos: asString(row.requisitos),
        };
      })
    : [];

  const declaracoesHabilitacao = Array.isArray(data.declaracoesHabilitacao)
    ? data.declaracoesHabilitacao.map((entry) => {
        const row = entry as Record<string, unknown>;
        return {
          titulo: asString(row.titulo, "Declaração"),
          conteudo: asString(row.conteudo),
        };
      })
    : [];

  const base: ProposalPackage = {
    checklist,
    metadata: {
      referencia: asString(metadata.referencia),
      orgao: asString(metadata.orgao),
      objeto: asString(metadata.objeto),
      processo: asString(metadata.processo),
      enderecoOrgao: asString(metadata.enderecoOrgao),
      horarioSessao: asString(metadata.horarioSessao),
      criterioJulgamento: asString(metadata.criterioJulgamento),
      tipoPregao: asString(metadata.tipoPregao),
      enquadramento: asString(metadata.enquadramento),
      lote: asString(metadata.lote),
    },
    itens,
    condicoesComerciais: {
      validade: asString(condicoes.validade),
      garantia: asString(condicoes.garantia),
      entrega: asString(condicoes.entrega),
      vigencia: asString(condicoes.vigencia),
      pagamento: asString(condicoes.pagamento),
    },
    declaracoesProposta: asString(data.declaracoesProposta),
    declaracoesHabilitacao,
    valorTotalExtenso: asString(data.valorTotalExtenso),
    generatedAt: new Date().toISOString(),
    model,
  };

  if (company) {
    return applyStandardProposalPackage(base, company);
  }

  return base;
}
