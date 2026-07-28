import type { ProposalPackage } from "@/lib/proposal-types";
import { formatCurrencyBRL } from "@/lib/proposal-layout";

export interface AuditProposalItemDetail {
  numero: string;
  titulo: string;
  fabricante: string;
  marca_modelo: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number | null;
  valor_total: number | null;
}

export function buildAnalysisAuditChanges(input: {
  title: string;
  orgao: string;
  objeto?: string;
  numeroPregao?: string;
  processo?: string;
  analysisMode: string;
  documentNames: string[];
}) {
  return {
    titulo: input.title,
    orgao: input.orgao,
    objeto: input.objeto?.trim() || "",
    numero_pregao: input.numeroPregao?.trim() || "",
    processo: input.processo?.trim() || "",
    analysis_mode: input.analysisMode,
    document_count: input.documentNames.length,
    documentos: input.documentNames,
  };
}

export function buildProposalAuditChanges(input: {
  pkg: ProposalPackage;
  companyId: string;
  grandTotal: number | null;
}) {
  const { pkg, companyId, grandTotal } = input;

  const itens: AuditProposalItemDetail[] = pkg.itens.slice(0, 100).map((item) => ({
    numero: item.numero,
    titulo: (item.tituloProduto || item.descricao.slice(0, 120)).trim(),
    fabricante: item.fabricante.trim(),
    marca_modelo: item.marcaModelo.trim(),
    quantidade: item.quantidade,
    unidade: item.unidade,
    valor_unitario: item.valorUnitario,
    valor_total: item.valorTotal,
  }));

  return {
    orgao: pkg.metadata.orgao?.trim() || "",
    objeto: pkg.metadata.objeto?.trim() || "",
    numero_pregao: pkg.metadata.numeroPregao?.trim() || "",
    processo: pkg.metadata.processo?.trim() || "",
    tipo_pregao: pkg.metadata.tipoPregao?.trim() || "",
    company_id: companyId,
    items_count: pkg.itens.length,
    grand_total: grandTotal,
    grand_total_fmt: formatCurrencyBRL(grandTotal),
    itens,
  };
}

export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "—";
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    if (!value.length) return "—";
    return value.map((entry) => formatAuditValue(entry)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function isProposalItemDetail(value: unknown): value is AuditProposalItemDetail {
  return (
    typeof value === "object" &&
    value !== null &&
    "numero" in value &&
    "titulo" in value
  );
}
