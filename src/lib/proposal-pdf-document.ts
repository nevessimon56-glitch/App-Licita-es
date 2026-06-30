import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  STANDARD_DECLARACOES_PROPOSTA,
  STANDARD_DIGITAL_SIGNATURE_NOTICE,
} from "./proposal-template";
import {
  PROPOSAL_TABLE_HEADERS,
  buildProposalCompanyHeader,
  buildProposalItemRows,
  getProposalGrandTotalFormatted,
} from "./proposal-layout";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const COLORS = {
  border: "#000000",
  headerBg: "#d9d9d9",
};

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
}

function p(
  text: string,
  options?: { bold?: boolean; margin?: [number, number] | [number, number, number, number] }
): Content {
  return {
    text: sanitize(text),
    fontSize: 9,
    bold: options?.bold,
    margin: options?.margin ?? [0, 0, 0, 4],
  };
}

function labelValue(label: string, value: string): Content {
  return {
    text: [
      { text: `${label}: `, bold: true, fontSize: 9 },
      { text: sanitize(value).toUpperCase(), fontSize: 9 },
    ],
    margin: [0, 0, 0, 4],
  };
}

function buildItemsTable(pkg: ProposalPackage): Content {
  const rows = buildProposalItemRows(pkg);

  return {
    table: {
      headerRows: 1,
      widths: [24, "*", 28, 90, 58, 58],
      body: [
        PROPOSAL_TABLE_HEADERS.map((header) => ({
          text: sanitize(header),
          bold: true,
          fontSize: 8,
          fillColor: COLORS.headerBg,
        })),
        ...rows.map((row) => [
          { text: sanitize(row.numero), fontSize: 8 } satisfies TableCell,
          { text: sanitize(row.especificacao), fontSize: 8 } satisfies TableCell,
          {
            text: sanitize(row.quantidade),
            fontSize: 8,
            alignment: "center",
          } satisfies TableCell,
          { text: sanitize(row.marcaModelo), fontSize: 8 } satisfies TableCell,
          {
            text: sanitize(row.valorUnitario),
            fontSize: 8,
            alignment: "right",
          } satisfies TableCell,
          {
            text: sanitize(row.valorTotal),
            fontSize: 8,
            alignment: "right",
          } satisfies TableCell,
        ]),
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
    margin: [0, 8, 0, 8],
  };
}

function buildSignatureBlock(company: CompanyProfile): Content[] {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";

  return [
    p(`DATA: ${company.assinaturaCidade.toUpperCase()} - [DIA] DE [MÊS] DE [ANO].`),
    labelValue("NOME", company.representanteNome),
    p(`RG SOB Nº ${company.representanteRg}`),
    p(`CPF SOB Nº ${company.representanteCpf}`),
    p(""),
    p(
      "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
      { bold: true }
    ),
    p(company.representanteNome.toUpperCase()),
    p(company.representanteRg),
    p(company.representanteCpf),
    p(
      `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`
    ),
  ];
}

function buildBaseStyles(): TDocumentDefinitions["styles"] {
  return {
    header: { fontSize: 10, bold: true, alignment: "center" },
    title: { fontSize: 12, bold: true, alignment: "center", margin: [0, 8, 0, 12] },
  };
}

export function buildProposalPdfDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile
): TDocumentDefinitions {
  const header = buildProposalCompanyHeader(company);
  const total = getProposalGrandTotalFormatted(pkg);

  const content: Content[] = [
    ...header.map((line) => ({ text: sanitize(line), style: "header" })),
    { text: sanitize(pkg.metadata.referencia.toUpperCase()), style: "header", margin: [0, 10, 0, 4] },
    { text: "PROPOSTA COMERCIAL DE PREÇOS", style: "title" },
    labelValue("ORGÃO", pkg.metadata.orgao),
    labelValue("OBJETO", pkg.metadata.objeto),
    labelValue("PROCESSO", pkg.metadata.processo),
    p("INFORMAÇÕES:", { bold: true, margin: [0, 8, 0, 4] }),
    labelValue("ENDEREÇO DO ÓRGÃO", pkg.metadata.enderecoOrgao),
    labelValue("CRITERIO DE JULGAMENTO", pkg.metadata.criterioJulgamento),
    labelValue("HORARIO", pkg.metadata.horarioSessao),
    p(
      `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`,
      { margin: [0, 8, 0, 6] }
    ),
    buildItemsTable(pkg),
    p(
      `VALOR TOTAL: ${total}    ${(pkg.valorTotalExtenso || "[PREENCHER POR EXTENSO]").toUpperCase()}.`,
      { bold: true, margin: [0, 8, 0, 8] }
    ),
    p("CONDIÇÕES COMERCIAIS DA PROPOSTA:", { bold: true, margin: [0, 10, 0, 6] }),
    labelValue("VALIDADE", pkg.condicoesComerciais.validade),
    labelValue("GARANTIA", pkg.condicoesComerciais.garantia),
    labelValue("ENTREGA", pkg.condicoesComerciais.entrega),
    labelValue("VIGÊNCIA", pkg.condicoesComerciais.vigencia),
    labelValue("PAGAMENTO", pkg.condicoesComerciais.pagamento),
    ...(pkg.metadata.lote.trim() ? [p(pkg.metadata.lote.toUpperCase())] : []),
    p("DECLARAÇÕES DA PROPOSTA:", { bold: true, margin: [0, 10, 0, 6] }),
    ...STANDARD_DECLARACOES_PROPOSTA.split("\n").map((line) => p(line)),
    p(STANDARD_DIGITAL_SIGNATURE_NOTICE, { margin: [0, 8, 0, 6] }),
    ...buildSignatureBlock(company),
  ];

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: buildBaseStyles(),
    content,
  };
}

export function buildDeclarationsPdfDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile
): TDocumentDefinitions {
  const header = buildProposalCompanyHeader(company);

  const content: Content[] = [
    ...header.map((line) => ({ text: sanitize(line), style: "header" })),
    { text: "DECLARAÇÕES", style: "title" },
    p(`À ${pkg.metadata.orgao.toUpperCase()}`),
    labelValue("OBJETO", pkg.metadata.objeto),
    labelValue("PROCESSO", pkg.metadata.processo),
    p(pkg.metadata.referencia.toUpperCase()),
    p(STANDARD_DIGITAL_SIGNATURE_NOTICE, { margin: [0, 8, 0, 6] }),
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    content.push(
      p(section.titulo.toUpperCase(), { bold: true, margin: [0, 10, 0, 6] }),
      ...section.conteudo.split("\n").map((line) => p(line))
    );
  }

  content.push(...buildSignatureBlock(company));

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: 9 },
    styles: buildBaseStyles(),
    content,
  };
}
