import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  PROPOSAL_PDF_COLORS,
  PROPOSAL_PDF_FONT,
  formatConditionLines,
  formatDeclarationLines,
  formatSpecificationLines,
} from "./proposal-export-styles";
import {
  STANDARD_DECLARACOES_PROPOSTA,
  STANDARD_DIGITAL_SIGNATURE_NOTICE,
} from "./proposal-template";
import {
  PROPOSAL_TABLE_HEADERS,
  buildProposalCompanyHeader,
  buildProposalItemRows,
  getProposalGrandTotalFormatted,
  getValorTotalExtenso,
} from "./proposal-layout";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const COLORS = PROPOSAL_PDF_COLORS;
const FONT = PROPOSAL_PDF_FONT;

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
}

function tableLayout() {
  return {
    hLineWidth: () => 0.6,
    vLineWidth: () => 0.6,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => FONT.cellPadding,
    paddingRight: () => FONT.cellPadding,
    paddingTop: () => FONT.cellPadding,
    paddingBottom: () => FONT.cellPadding,
  };
}

function textLines(
  lines: string[],
  options?: { bold?: boolean; fontSize?: number; alignment?: "left" | "center" | "right" }
): TableCell {
  return {
    text: lines.map((line) => sanitize(line)),
    fontSize: options?.fontSize ?? FONT.table,
    bold: options?.bold,
    alignment: options?.alignment,
    lineHeight: FONT.lineHeight,
  } satisfies TableCell;
}

function grayCell(
  content: Record<string, unknown>,
  options?: { colSpan?: number; rowSpan?: number }
): TableCell {
  return {
    ...content,
    fillColor: COLORS.headerBg,
    colSpan: options?.colSpan,
    rowSpan: options?.rowSpan,
  } as TableCell;
}

function labelValueRow(label: string, value: string): TableCell[] {
  return [
    grayCell({
      text: sanitize(label),
      bold: true,
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
    }),
    textLines(formatConditionLines(value), { fontSize: FONT.table }),
  ];
}

function sectionHeaderRow(title: string): TableCell[] {
  return [
    grayCell(
      {
        text: sanitize(title),
        bold: true,
        fontSize: FONT.table,
        alignment: "center",
        lineHeight: FONT.lineHeight,
      },
      { colSpan: 2 }
    ),
    {},
  ];
}

function buildMetadataTable(pkg: ProposalPackage, company: CompanyProfile): Content {
  const bankLine = `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`;

  return {
    table: {
      widths: ["24%", "*"],
      body: [
        labelValueRow("ORGÃO:", pkg.metadata.orgao),
        labelValueRow("OBJETO:", pkg.metadata.objeto),
        labelValueRow("PROCESSO:", pkg.metadata.processo),
        sectionHeaderRow("INFORMAÇÕES"),
        labelValueRow("ENDEREÇO DO ÓRGÃO", pkg.metadata.enderecoOrgao),
        labelValueRow("CRITERIO DE JULGAMENTO", pkg.metadata.criterioJulgamento),
        labelValueRow("HORARIO", pkg.metadata.horarioSessao),
        [
          grayCell(
            {
              text: sanitize(bankLine),
              fontSize: FONT.table,
              lineHeight: FONT.lineHeight,
            },
            { colSpan: 2 }
          ),
          {},
        ],
      ],
    },
    layout: tableLayout(),
    margin: [0, 0, 0, 10],
  };
}

function buildItemsTable(pkg: ProposalPackage): Content {
  const rows = buildProposalItemRows(pkg);
  const total = getProposalGrandTotalFormatted(pkg);

  return {
    table: {
      headerRows: 1,
      widths: [22, "*", 28, 88, 54, 54],
      body: [
        PROPOSAL_TABLE_HEADERS.map((header) =>
          grayCell({
            text: sanitize(header),
            bold: true,
            fontSize: FONT.tableSmall,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          })
        ),
        ...rows.map((row) => [
          {
            text: sanitize(row.numero),
            fontSize: FONT.table,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          textLines(formatSpecificationLines(row.especificacao), {
            fontSize: FONT.table,
          }),
          {
            text: sanitize(row.quantidade),
            fontSize: FONT.table,
            bold: true,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          textLines(formatConditionLines(row.marcaModelo), { fontSize: FONT.table }),
          {
            text: sanitize(row.valorUnitario),
            fontSize: FONT.table,
            alignment: "right",
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          {
            text: sanitize(row.valorTotal),
            fontSize: FONT.table,
            bold: true,
            alignment: "right",
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
        ]),
        [
          grayCell(
            {
              stack: [
                {
                  text: "VALOR TOTAL:",
                  bold: true,
                  fontSize: FONT.table,
                  margin: [0, 0, 0, 4],
                },
                {
                  text: sanitize(getValorTotalExtenso(pkg)),
                  fontSize: FONT.table,
                  lineHeight: FONT.lineHeight,
                },
              ],
            },
            { colSpan: 5 }
          ),
          {},
          {},
          {},
          {},
          grayCell({
            text: sanitize(total),
            bold: true,
            fontSize: FONT.totalAmount,
            alignment: "center",
            lineHeight: 1.1,
          }),
        ],
      ],
    },
    layout: tableLayout(),
    margin: [0, 0, 0, 10],
  };
}

function buildConditionsTable(pkg: ProposalPackage): Content {
  const body: TableCell[][] = [
    sectionHeaderRow("CONDIÇÕES COMERCIAIS DA PROPOSTA:"),
    labelValueRow("VALIDADE:", pkg.condicoesComerciais.validade),
    labelValueRow("GARANTIA:", pkg.condicoesComerciais.garantia),
    labelValueRow("ENTREGA:", pkg.condicoesComerciais.entrega),
    labelValueRow("VIGÊNCIA:", pkg.condicoesComerciais.vigencia),
    labelValueRow("PAGAMENTO:", pkg.condicoesComerciais.pagamento),
  ];

  if (pkg.metadata.lote.trim()) {
    body.push([
      {
        text: sanitize(pkg.metadata.lote.toUpperCase()),
        fontSize: FONT.table,
        colSpan: 2,
        lineHeight: FONT.lineHeight,
      },
      {},
    ]);
  }

  return {
    table: { widths: ["24%", "*"], body },
    layout: tableLayout(),
    margin: [0, 0, 0, 10],
  };
}


function buildDeclarationsTableFixed(): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          grayCell({
            text: "DECLARAÇÕES DA PROPOSTA:",
            bold: true,
            fontSize: FONT.table,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          }),
        ],
        [
          textLines(formatDeclarationLines(STANDARD_DECLARACOES_PROPOSTA), {
            fontSize: FONT.table,
          }),
        ],
      ],
    },
    layout: tableLayout(),
    margin: [0, 0, 0, 10],
  };
}

function buildSignatureTable(company: CompanyProfile): Content {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";

  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            stack: [
              {
                text: `DATA: ${company.assinaturaCidade.toUpperCase()} - [DIA] DE [MÊS] DE [ANO].`,
                fontSize: FONT.table,
                alignment: "center",
                margin: [0, 0, 0, 8],
              },
              {
                text: `NOME: ${company.representanteNome.toUpperCase()}`,
                fontSize: FONT.table,
                margin: [0, 0, 0, 4],
              },
              { text: `RG SOB Nº ${company.representanteRg}`, fontSize: FONT.table, margin: [0, 0, 0, 4] },
              { text: `CPF SOB Nº ${company.representanteCpf}`, fontSize: FONT.table },
            ],
            lineHeight: FONT.lineHeight,
          },
        ],
        [
          grayCell({
            text: "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
            bold: true,
            fontSize: FONT.tableSmall,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          }),
        ],
        [
          {
            stack: [
              { text: company.representanteNome.toUpperCase(), fontSize: FONT.table },
              { text: company.representanteRg, fontSize: FONT.table, margin: [0, 4, 0, 0] },
              { text: company.representanteCpf, fontSize: FONT.table, margin: [0, 4, 0, 0] },
              {
                text: `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`,
                fontSize: FONT.table,
                lineHeight: FONT.lineHeight,
                margin: [0, 4, 0, 0],
              },
            ],
          },
        ],
        [
          {
            text: STANDARD_DIGITAL_SIGNATURE_NOTICE,
            fontSize: FONT.tableSmall,
            alignment: "center",
            lineHeight: FONT.lineHeight,
          },
        ],
      ],
    },
    layout: tableLayout(),
    margin: [0, 0, 0, 0],
  };
}

function buildBaseStyles(): TDocumentDefinitions["styles"] {
  return {
    companyName: {
      fontSize: FONT.companyName,
      bold: true,
      alignment: "center",
      lineHeight: 1.15,
      margin: [0, 0, 0, 3],
    },
    companyDetail: {
      fontSize: FONT.companyDetail,
      alignment: "center",
      lineHeight: 1.15,
      margin: [0, 0, 0, 2],
    },
    referencia: {
      fontSize: FONT.companyDetail,
      alignment: "center",
      margin: [0, 8, 0, 6],
    },
    title: {
      fontSize: FONT.title,
      bold: true,
      alignment: "center",
      margin: [0, 4, 0, 12],
    },
  };
}

export function buildProposalPdfDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile
): TDocumentDefinitions {
  const header = buildProposalCompanyHeader(company);

  const content: Content[] = [
    { text: sanitize(header[0]), style: "companyName" },
    { text: sanitize(header[1]), style: "companyDetail" },
    { text: sanitize(header[2]), style: "companyDetail" },
    { text: sanitize(header[4] ?? header[3]), style: "companyDetail", margin: [0, 4, 0, 0] },
    { text: sanitize(pkg.metadata.referencia.toUpperCase()), style: "referencia" },
    { text: "PROPOSTA COMERCIAL DE PREÇOS", style: "title" },
    buildMetadataTable(pkg, company),
    buildItemsTable(pkg),
    buildConditionsTable(pkg),
    buildDeclarationsTableFixed(),
    buildSignatureTable(company),
  ];

  return {
    pageSize: "A4",
    pageMargins: [32, 32, 32, 32],
    defaultStyle: { font: "Roboto", fontSize: FONT.body, lineHeight: FONT.lineHeight },
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
    { text: sanitize(header[0]), style: "companyName" },
    { text: sanitize(header[1]), style: "companyDetail" },
    { text: sanitize(header[2]), style: "companyDetail" },
    { text: sanitize(header[4] ?? header[3]), style: "companyDetail", margin: [0, 4, 0, 0] },
    { text: "DECLARAÇÕES", style: "title" },
    buildMetadataTable(pkg, company),
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    content.push({
      table: {
        widths: ["*"],
        body: [
          [
            grayCell({
              text: sanitize(section.titulo.toUpperCase()),
              bold: true,
              fontSize: FONT.table,
              alignment: "center",
              lineHeight: FONT.lineHeight,
            }),
          ],
          [
            textLines(formatDeclarationLines(section.conteudo), {
              fontSize: FONT.table,
            }),
          ],
        ],
      },
      layout: tableLayout(),
      margin: [0, 0, 0, 10],
    });
  }

  content.push(buildSignatureTable(company));

  return {
    pageSize: "A4",
    pageMargins: [32, 32, 32, 32],
    defaultStyle: { font: "Roboto", fontSize: FONT.body, lineHeight: FONT.lineHeight },
    styles: buildBaseStyles(),
    content,
  };
}
