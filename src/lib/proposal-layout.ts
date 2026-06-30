import {
  formatCompanyAddressLine,
  formatCompanyCnpjLine,
  formatCompanyContactLine,
} from "./company-defaults";
import { STANDARD_TABLE_HEADER } from "./proposal-template";
import type { CompanyProfile, ProposalItem, ProposalPackage } from "./proposal-types";

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
  valorUnitario: string;
  valorTotal: string;
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

export function buildMarcaModeloLine(item: ProposalItem): string {
  const base = [item.fabricante, item.marcaModelo].filter(Boolean).join(" / ");
  if (!base) return "A INFORMAR";
  return item.semInstalacao ? `${base} - SEM INSTALAÇÃO.` : `${base.toUpperCase()}.`;
}

export function buildProposalItemRows(pkg: ProposalPackage): ProposalItemRow[] {
  return pkg.itens.map((item) => ({
    numero: item.numero,
    especificacao: buildItemSpecificationColumn(item),
    quantidade: String(item.quantidade),
    marcaModelo: buildMarcaModeloLine(item),
    valorUnitario: formatCurrencyBRL(item.valorUnitario),
    valorTotal: formatCurrencyBRL(item.valorTotal),
  }));
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
