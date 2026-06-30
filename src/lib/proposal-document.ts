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

function buildItemDescriptionLine(item: ProposalItem): string {
  const parts = [item.unidade, item.codigo, item.descricao]
    .map((part) => part.trim())
    .filter(Boolean);

  let line = parts.join(" - ");
  if (item.descricaoComplementar.trim()) {
    line += `\n${item.descricaoComplementar.trim()}`;
  }
  return line.toUpperCase();
}

function buildMarcaModeloLine(item: ProposalItem): string {
  const base = [item.fabricante, item.marcaModelo].filter(Boolean).join(" / ");
  if (!base) return "A INFORMAR";
  return item.semInstalacao ? `${base} - SEM INSTALAÇÃO.` : base;
}

export function buildProposalDocumentText(
  pkg: ProposalPackage,
  company: CompanyProfile
): string {
  const total = getProposalGrandTotal(pkg);
  const lines: string[] = [
    company.razaoSocial,
    `CNPJ: ${company.cnpj}`,
    `INSCRIÇÃO ESTADUAL: ${company.inscricaoEstadual}`,
    `TELEFONE: ${company.telefone} - FAX: ${company.fax} - E-MAIL: ${company.email}`,
    company.endereco,
    `${company.municipio}, ESTADO: ${company.estado} - CEP: ${company.cep}`,
    "",
    pkg.metadata.referencia,
    "",
    "PROPOSTA COMERCIAL DE PREÇOS",
    "",
    `À ${pkg.metadata.orgao}`,
    pkg.metadata.objeto,
    "",
    `ORGÃO: ${pkg.metadata.orgao}`,
    `OBJETO: ${pkg.metadata.objeto}`,
    `PROCESSO: ${pkg.metadata.processo}`,
    `ENDEREÇO DO ÓRGÃO: ${pkg.metadata.enderecoOrgao}`,
    `DADOS BANCARIOS: ${company.banco} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`,
    `INFORMAÇÕES: HORARIO: ${pkg.metadata.horarioSessao}`,
    `CRITERIO DE JULGAMENTO: ${pkg.metadata.criterioJulgamento}`,
    "",
    "ITEM | UNIDADE - CÓDIGO - ESPECIFICAÇÃO | QNT | FABRICANTE MARCA / MODELO | VALOR UNITARIO | VALOR TOTAL",
  ];

  for (const item of pkg.itens) {
    lines.push(
      [
        item.numero,
        buildItemDescriptionLine(item),
        String(item.quantidade),
        buildMarcaModeloLine(item),
        formatCurrencyBRL(item.valorUnitario),
        formatCurrencyBRL(item.valorTotal),
      ].join(" | ")
    );
  }

  lines.push(
    "",
    `${formatCurrencyBRL(total)}    VALOR TOTAL: ${pkg.valorTotalExtenso || "[PREENCHER POR EXTENSO]"}.`,
    "",
    "CONDIÇÕES COMERCIAIS DA PROPOSTA:",
    `VALIDADE: ${pkg.condicoesComerciais.validade}`,
    `GARANTIA: ${pkg.condicoesComerciais.garantia}`,
    `ENTREGA: ${pkg.condicoesComerciais.entrega}`,
    `VIGÊNCIA: ${pkg.condicoesComerciais.vigencia}`,
    `PAGAMENTO: ${pkg.condicoesComerciais.pagamento}`,
    ""
  );

  if (pkg.metadata.lote) {
    lines.push(pkg.metadata.lote, "");
  }

  lines.push(
    "DECLARAÇÕES DA PROPOSTA:",
    pkg.declaracoesProposta,
    "",
    "DOCUMENTO ASSINADO DIGITALMENTE, CONFORME LEI N. 14603/2020, QUE VERSA DA LEGALIDADE DA ASSINATURA DIGITAL, DISPENSANDO RECONHECIMENTO DE FIRMA EM CARTÓRIO.",
    "",
    `${company.assinaturaCidade} - [DATA]`,
    `DATA:`,
    `NOME: ${company.representanteNome}`,
    `RG SOB Nº ${company.representanteRg}`,
    `CPF SOB Nº ${company.representanteCpf}`,
    "",
    "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
    company.representanteNome,
    company.representanteRg,
    company.representanteCpf,
    `CARGO: ${company.representanteCargo}, DATA DE NASCIMENTO: ${company.representanteNascimento}, ENDEREÇO: ${company.representanteEndereco}`
  );

  return lines.join("\n");
}

export function buildDeclarationsDocumentText(
  pkg: ProposalPackage,
  company: CompanyProfile
): string {
  const lines: string[] = [
    company.razaoSocial,
    `CNPJ: ${company.cnpj}`,
    `INSCRIÇÃO ESTADUAL: ${company.inscricaoEstadual}`,
    `TELEFONE: ${company.telefone} - E-MAIL: ${company.email}`,
    company.endereco,
    `${company.municipio}, ${company.estado} - CEP: ${company.cep}`,
    "",
    "DECLARAÇÕES",
    `À ${pkg.metadata.orgao}`,
    pkg.metadata.objeto,
    pkg.metadata.referencia,
    "",
    "DOCUMENTO ASSINADO DIGITALMENTE, CONFORME LEI N. 14603/2020.",
    "",
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    lines.push(section.titulo, "", section.conteudo, "");
  }

  lines.push(
    `${company.assinaturaCidade} - [DATA]`,
    `NOME: ${company.representanteNome}`,
    `RG SOB Nº ${company.representanteRg}`,
    `CPF SOB Nº ${company.representanteCpf}`
  );

  return lines.join("\n");
}

export function buildChecklistText(pkg: ProposalPackage): string {
  const lines = ["CHECK-LIST DE PARTICIPAÇÃO", ""];
  let currentCategory = "";

  for (const entry of pkg.checklist) {
    if (entry.categoria !== currentCategory) {
      currentCategory = entry.categoria;
      lines.push("", `## ${currentCategory}`, "");
    }
    lines.push(`☐ ${entry.item}`);
    if (entry.requisitos) {
      lines.push(`   Requisitos: ${entry.requisitos}`);
    }
  }

  if (pkg.metadata.tipoPregao) {
    lines.push("", `Tipo de Pregão: ${pkg.metadata.tipoPregao}`);
  }
  if (pkg.metadata.enquadramento) {
    lines.push(`Enquadramento: ${pkg.metadata.enquadramento}`);
  }

  return lines.join("\n");
}
