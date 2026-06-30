import {
  formatCompanyAddressLine,
  formatCompanyCnpjLine,
  formatCompanyContactLine,
} from "./company-defaults";
import { PROPOSAL_SEM_INSTALACAO_SUFFIX } from "./proposal-export-styles";
import { STANDARD_TABLE_HEADER } from "./proposal-template";
import type { CompanyProfile, ProposalItem, ProposalPackage } from "./proposal-types";
import { formatCurrencyExtenso } from "./currency-extenso";

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getProposalGrandTotal(pkg: ProposalPackage): number {
  return pkg.itens.reduce((sum, item) => sum + (item.valorTotal ?? 0), 0);
}

export interface ProposalItemRow {
  numero: string;
  especificacao: string;
  quantidade: string;
  marcaModelo: string;
  marcaModeloBase: string;
  semInstalacao: boolean;
  valorUnitario: string;
  valorTotal: string;
}

export function buildMarcaModeloParts(item: ProposalItem): {
  base: string;
  semInstalacao: boolean;
  hasFabricanteMarca: boolean;
} {
  const hasFabricanteMarca = Boolean(
    [item.fabricante, item.marcaModelo].map((part) => part.trim()).filter(Boolean).length
  );
  const base = hasFabricanteMarca
    ? [item.fabricante, item.marcaModelo]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" / ")
        .toUpperCase()
    : "A INFORMAR";

  return {
    base,
    semInstalacao: item.semInstalacao,
    hasFabricanteMarca,
  };
}

export function buildMarcaModeloLine(item: ProposalItem): string {
  const { base, semInstalacao, hasFabricanteMarca } = buildMarcaModeloParts(item);
  if (semInstalacao) {
    return `${base}${PROPOSAL_SEM_INSTALACAO_SUFFIX}`;
  }
  if (hasFabricanteMarca) return `${base}.`;
  return base;
}

export function buildItemSpecificationColumn(item: ProposalItem): string {
  const parts = [item.unidade, item.codigo, item.descricao]
    .map((part) => part.trim())
    .filter(Boolean);

  let spec = parts.join(" - ").toUpperCase();
  if (item.descricaoComplementar.trim()) {
    spec += `\n${item.descricaoComplementar.trim().toUpperCase()}`;
  }
  return spec;
}

export function buildProposalItemRows(pkg: ProposalPackage): ProposalItemRow[] {
  return pkg.itens.map((item) => {
    const marca = buildMarcaModeloParts(item);
    return {
      numero: item.numero,
      especificacao: buildItemSpecificationColumn(item),
      quantidade: String(item.quantidade),
      marcaModelo: buildMarcaModeloLine(item),
      marcaModeloBase: marca.base,
      semInstalacao: marca.semInstalacao,
      valorUnitario: formatCurrencyBRL(item.valorUnitario),
      valorTotal: formatCurrencyBRL(item.valorTotal),
    };
  });
}

export function buildProposalCompanyHeader(company: CompanyProfile): string[] {
  return [
    company.razaoSocial.toUpperCase(),
    formatCompanyCnpjLine(company).toUpperCase(),
    formatCompanyContactLine(company).toUpperCase(),
    "",
    formatCompanyAddressLine(company).toUpperCase(),
  ];
}

export const PROPOSAL_TABLE_HEADERS = [
  "ITEM",
  STANDARD_TABLE_HEADER,
  "QNT",
  "FABRICANTE MARCA / MODELO",
  "VALOR UNITARIO",
  "VALOR TOTAL",
] as const;

export function getProposalGrandTotalFormatted(pkg: ProposalPackage): string {
  return formatCurrencyBRL(getProposalGrandTotal(pkg));
}

/** Usa o texto editado pelo usuário ou calcula automaticamente a partir do total. */
export function getValorTotalExtenso(
  pkg: ProposalPackage,
  total?: number
): string {
  const manual = pkg.valorTotalExtenso.trim();
  if (
    manual &&
    !manual.toUpperCase().includes("PREENCHER POR EXTENSO")
  ) {
    return manual.toUpperCase();
  }

  const amount = total ?? getProposalGrandTotal(pkg);
  return formatCurrencyExtenso(amount);
}
