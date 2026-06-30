import type { CompanyProfile, ProposalItem, ProposalPackage } from "./proposal-types";
import {
  STANDARD_CHECKLIST_CATEGORIES,
  STANDARD_DECLARACOES_PROPOSTA,
  STANDARD_DIGITAL_SIGNATURE_NOTICE,
  STANDARD_TABLE_HEADER,
} from "./proposal-template";

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "R$ 0,00";
  }
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function recalculateItemTotals(item: ProposalItem): ProposalItem {
  if (item.valorUnitario === null || !Number.isFinite(item.valorUnitario)) {
    return { ...item, valorTotal: null };
  }
  return {
    ...item,
    valorTotal: item.quantidade * item.valorUnitario,
  };
}

export function recalculateProposalTotals(pkg: ProposalPackage): ProposalPackage {
  const itens = pkg.itens.map(recalculateItemTotals);
  return { ...pkg, itens };
}

export function getProposalGrandTotal(pkg: ProposalPackage): number {
  return pkg.itens.reduce((sum, item) => sum + (item.valorTotal ?? 0), 0);
}

function buildItemSpecificationColumn(item: ProposalItem): string {
  const parts = [item.unidade, item.codigo, item.descricao]
    .map((part) => part.trim())
    .filter(Boolean);

  let spec = parts.join(" - ").toUpperCase();
  if (item.descricaoComplementar.trim()) {
    spec += `\n${item.descricaoComplementar.trim().toUpperCase()}`;
  }
  return spec;
}

function buildMarcaModeloLine(item: ProposalItem): string {
  const base = [item.fabricante, item.marcaModelo].filter(Boolean).join(" / ");
  if (!base) return "A INFORMAR";
  return item.semInstalacao ? `${base} - SEM INSTALAÇÃO.` : `${base.toUpperCase()}.`;
}

export function buildProposalDocumentText(
  pkg: ProposalPackage,
  company: CompanyProfile
): string {
  const total = getProposalGrandTotal(pkg);
  const lines: string[] = [
    company.razaoSocial.toUpperCase(),
    `CNPJ: ${company.cnpj}`,
    `INSCRIÇÃO ESTADUAL: ${company.inscricaoEstadual}`,
    `TELEFONE: ${company.telefone} - FAX: ${company.fax} - E-MAIL: ${company.email}`,
    company.endereco.toUpperCase(),
    `${company.municipio.toUpperCase()}, ESTADO: ${company.estado.toUpperCase()} - CEP: ${company.cep}`,
    "",
    pkg.metadata.referencia.toUpperCase(),
    "",
    "PROPOSTA COMERCIAL DE PREÇOS",
    "",
    `À ${pkg.metadata.orgao.toUpperCase()}`,
    pkg.metadata.objeto.toUpperCase(),
    "",
    `ORGÃO: ${pkg.metadata.orgao.toUpperCase()}`,
    `OBJETO: ${pkg.metadata.objeto.toUpperCase()}`,
    `PROCESSO: ${pkg.metadata.processo.toUpperCase()}`,
    `ENDEREÇO DO ÓRGÃO: ${pkg.metadata.enderecoOrgao.toUpperCase()}`,
    `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`,
    `INFORMAÇÕES: HORARIO: ${pkg.metadata.horarioSessao.toUpperCase()}`,
    `CRITERIO DE JULGAMENTO: ${pkg.metadata.criterioJulgamento.toUpperCase()}`,
    "",
    `ITEM | ${STANDARD_TABLE_HEADER} | QNT | FABRICANTE MARCA / MODELO | VALOR UNITARIO | VALOR TOTAL`,
  ];

  for (const item of pkg.itens) {
    lines.push(
      [
        item.numero,
        buildItemSpecificationColumn(item),
        String(item.quantidade),
        buildMarcaModeloLine(item),
        formatCurrencyBRL(item.valorUnitario),
        formatCurrencyBRL(item.valorTotal),
      ].join(" | ")
    );
  }

  lines.push(
    "",
    `${formatCurrencyBRL(total)}    VALOR TOTAL: ${(pkg.valorTotalExtenso || "[PREENCHER POR EXTENSO]").toUpperCase()}.`,
    "",
    "CONDIÇÕES COMERCIAIS DA PROPOSTA:",
    `VALIDADE: ${pkg.condicoesComerciais.validade.toUpperCase()}`,
    `GARANTIA: ${pkg.condicoesComerciais.garantia.toUpperCase()}`,
    `ENTREGA: ${pkg.condicoesComerciais.entrega.toUpperCase()}`,
    `VIGÊNCIA: ${pkg.condicoesComerciais.vigencia.toUpperCase()}`,
    `PAGAMENTO: ${pkg.condicoesComerciais.pagamento.toUpperCase()}`,
    ""
  );

  if (pkg.metadata.lote.trim()) {
    lines.push(pkg.metadata.lote.toUpperCase(), "");
  }

  lines.push(
    "DECLARAÇÕES DA PROPOSTA:",
    STANDARD_DECLARACOES_PROPOSTA,
    "",
    STANDARD_DIGITAL_SIGNATURE_NOTICE,
    "",
    `${company.assinaturaCidade.toUpperCase()} - [DATA]`,
    "DATA:",
    `NOME: ${company.representanteNome.toUpperCase()}`,
    `RG SOB Nº ${company.representanteRg}`,
    `CPF SOB Nº ${company.representanteCpf}`,
    "",
    "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
    company.representanteNome.toUpperCase(),
    company.representanteRg,
    company.representanteCpf,
    `CARGO: ${company.representanteCargo.toUpperCase()}, DATA DE NASCIMENTO: ${company.representanteNascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`
  );

  return lines.join("\n");
}

export function buildDeclarationsDocumentText(
  pkg: ProposalPackage,
  company: CompanyProfile
): string {
  const lines: string[] = [
    company.razaoSocial.toUpperCase(),
    `CNPJ: ${company.cnpj}`,
    `INSCRIÇÃO ESTADUAL: ${company.inscricaoEstadual}`,
    `TELEFONE: ${company.telefone} - FAX: ${company.fax} - E-MAIL: ${company.email}`,
    company.endereco.toUpperCase(),
    `${company.municipio.toUpperCase()}, ESTADO: ${company.estado.toUpperCase()} - CEP: ${company.cep}`,
    "",
    "DECLARAÇÕES",
    `À ${pkg.metadata.orgao.toUpperCase()}`,
    pkg.metadata.objeto.toUpperCase(),
    pkg.metadata.referencia.toUpperCase(),
    "",
    STANDARD_DIGITAL_SIGNATURE_NOTICE,
    "",
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    lines.push(section.titulo.toUpperCase(), "", section.conteudo, "");
  }

  lines.push(
    `${company.assinaturaCidade.toUpperCase()} - [DATA]`,
    "DATA:",
    `NOME: ${company.representanteNome.toUpperCase()}`,
    `RG SOB Nº ${company.representanteRg}`,
    `CPF SOB Nº ${company.representanteCpf}`,
    "",
    "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
    company.representanteNome.toUpperCase(),
    company.representanteRg,
    company.representanteCpf,
    `CARGO: ${company.representanteCargo.toUpperCase()}, DATA DE NASCIMENTO: ${company.representanteNascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`
  );

  return lines.join("\n");
}

export function buildChecklistText(pkg: ProposalPackage): string {
  const lines = ["CHECK-LIST DE PARTICIPAÇÃO — LAYOUT PADRÃO", ""];

  for (const category of STANDARD_CHECKLIST_CATEGORIES) {
    const items = pkg.checklist.filter((entry) => entry.categoria === category);
    if (!items.length) continue;

    lines.push(category.toUpperCase(), "");
    for (const entry of items) {
      lines.push(`☐ ${entry.item.toUpperCase()}`);
      if (entry.requisitos) {
        lines.push(`   REQUISITOS: ${entry.requisitos.toUpperCase()}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
