import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  PROPOSAL_PDF_COLORS,
  PROPOSAL_PDF_FONT,
  PROPOSAL_SEM_INSTALACAO_COLOR_PDF,
  PROPOSAL_SEM_INSTALACAO_SUFFIX,
  formatConditionForExport,
  formatDeclarationLines,
  formatSpecificationForExport,
  shouldShowLote,
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
import type { ProposalItemRow } from "./proposal-layout";

const COLORS = PROPOSAL_PDF_COLORS;
const FONT = PROPOSAL_PDF_FONT;

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
}

function itemsTableLayout() {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => FONT.cellPadding,
    paddingRight: () => FONT.cellPadding,
    paddingTop: () => FONT.cellPadding,
    paddingBottom: () => FONT.cellPadding,
  };
}

function grayBar(text: string, margin: [number, number, number, number] = [0, 6, 0, 4]): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: sanitize(text),
            bold: true,
            fontSize: FONT.table,
            fillColor: COLORS.headerBg,
            margin: [2, 3, 2, 3],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0,
    },
    margin,
  };
}

function labeledLine(label: string, value: string): Content {
  return {
    text: [
      { text: `${label} `, bold: true, fontSize: FONT.table },
      { text: sanitize(formatConditionForExport(value)), fontSize: FONT.table },
    ],
    lineHeight: FONT.lineHeight,
    margin: [0, 0, 0, 3],
  };
}

function buildMetadataSection(pkg: ProposalPackage, company: CompanyProfile): Content[] {
  const bankLine = `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`;

  return [
    labeledLine("ORGÃO:", pkg.metadata.orgao),
    labeledLine("OBJETO:", pkg.metadata.objeto),
    labeledLine("PROCESSO:", pkg.metadata.processo),
    grayBar("INFORMAÇÕES", [0, 6, 0, 0]),
    {
      table: {
        widths: ["30%", "*"],
        body: [
          [
            {
              text: "ENDEREÇO DO ÓRGÃO",
              bold: true,
              fontSize: FONT.tableSmall,
              margin: [0, 2, 0, 2],
            },
            {
              text: sanitize(formatConditionForExport(pkg.metadata.enderecoOrgao)),
              fontSize: FONT.tableSmall,
              lineHeight: FONT.lineHeight,
            },
          ],
          [
            {
              text: "CRITERIO DE JULGAMENTO",
              bold: true,
              fontSize: FONT.tableSmall,
              margin: [0, 2, 0, 2],
            },
            {
              text: sanitize(formatConditionForExport(pkg.metadata.criterioJulgamento)),
              fontSize: FONT.tableSmall,
              lineHeight: FONT.lineHeight,
            },
          ],
          [
            {
              text: "HORARIO",
              bold: true,
              fontSize: FONT.tableSmall,
              margin: [0, 2, 0, 2],
            },
            {
              text: sanitize(formatConditionForExport(pkg.metadata.horarioSessao)),
              fontSize: FONT.tableSmall,
              lineHeight: FONT.lineHeight,
            },
          ],
        ],
      },
      layout: itemsTableLayout(),
      margin: [0, 0, 0, 6],
    },
    grayBar(bankLine, [0, 0, 0, 8]),
  ];
}

function buildMarcaModeloPdfCell(row: ProposalItemRow): TableCell {
  if (!row.semInstalacao) {
    return {
      text: sanitize(row.marcaModelo),
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
    } satisfies TableCell;
  }

  return {
    text: [
      { text: sanitize(row.marcaModeloBase), fontSize: FONT.table },
      {
        text: sanitize(PROPOSAL_SEM_INSTALACAO_SUFFIX),
        fontSize: FONT.table,
        color: PROPOSAL_SEM_INSTALACAO_COLOR_PDF,
        bold: true,
      },
    ],
    lineHeight: FONT.lineHeight,
  } satisfies TableCell;
}

function buildItemsTable(pkg: ProposalPackage): Content {
  const rows = buildProposalItemRows(pkg);
  const total = getProposalGrandTotalFormatted(pkg);

  return {
    table: {
      headerRows: 1,
      widths: [20, "*", 24, 78, 50, 50],
      body: [
        PROPOSAL_TABLE_HEADERS.map((header) => ({
          text: sanitize(header),
          bold: true,
          fontSize: FONT.tableSmall,
          alignment: "center" as const,
          fillColor: COLORS.headerBg,
          lineHeight: FONT.lineHeight,
        })),
        ...rows.map((row) => [
          {
            text: sanitize(row.numero),
            fontSize: FONT.table,
            alignment: "center" as const,
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          {
            text: sanitize(formatSpecificationForExport(row.especificacao)),
            fontSize: FONT.table,
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          {
            text: sanitize(row.quantidade),
            fontSize: FONT.table,
            bold: true,
            alignment: "center" as const,
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          buildMarcaModeloPdfCell(row),
          {
            text: sanitize(row.valorUnitario),
            fontSize: FONT.table,
            alignment: "right" as const,
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
          {
            text: sanitize(row.valorTotal),
            fontSize: FONT.table,
            bold: true,
            alignment: "right" as const,
            lineHeight: FONT.lineHeight,
          } satisfies TableCell,
        ]),
        [
          {
            text: [
              { text: "VALOR TOTAL: ", bold: true, fontSize: FONT.table },
              {
                text: sanitize(getValorTotalExtenso(pkg)),
                fontSize: FONT.table,
              },
            ],
            fillColor: COLORS.headerBg,
            colSpan: 5,
            lineHeight: FONT.lineHeight,
            margin: [2, 3, 2, 3],
          },
          {},
          {},
          {},
          {},
          {
            text: sanitize(total),
            bold: true,
            fontSize: FONT.totalAmount,
            alignment: "center" as const,
            fillColor: COLORS.headerBg,
            lineHeight: 1.05,
            margin: [2, 3, 2, 3],
          },
        ],
      ],
    },
    layout: itemsTableLayout(),
    margin: [0, 0, 0, 8],
  };
}

function buildConditionsSection(pkg: ProposalPackage): Content[] {
  const items: Content[] = [
    grayBar("CONDIÇÕES COMERCIAIS DA PROPOSTA:"),
    labeledLine("VALIDADE:", pkg.condicoesComerciais.validade),
    labeledLine("GARANTIA:", pkg.condicoesComerciais.garantia),
    labeledLine("ENTREGA:", pkg.condicoesComerciais.entrega),
    labeledLine("VIGÊNCIA:", pkg.condicoesComerciais.vigencia),
    labeledLine("PAGAMENTO:", pkg.condicoesComerciais.pagamento),
  ];

  if (shouldShowLote(pkg.metadata.lote)) {
    items.push({
      text: sanitize(formatConditionForExport(pkg.metadata.lote)),
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
      margin: [0, 0, 0, 4],
    });
  }

  return items;
}

function buildDeclarationsSection(): Content[] {
  return [
    grayBar("DECLARAÇÕES DA PROPOSTA:"),
    ...formatDeclarationLines(STANDARD_DECLARACOES_PROPOSTA).map((line) => ({
      text: sanitize(line),
      fontSize: FONT.table,
      lineHeight: 1.15,
      margin: [0, 0, 0, 3] as [number, number, number, number],
    })),
  ];
}

function buildSignatureSection(company: CompanyProfile): Content[] {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";

  return [
    {
      text: `DATA: ${company.assinaturaCidade.toUpperCase()} - [DIA] DE [MÊS] DE [ANO].`,
      fontSize: FONT.table,
      alignment: "center" as const,
      margin: [0, 10, 0, 8],
    },
    labeledLine("NOME:", company.representanteNome),
    {
      text: `RG SOB Nº ${company.representanteRg}`,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: `CPF SOB Nº ${company.representanteCpf}`,
      fontSize: FONT.table,
      margin: [0, 0, 0, 8],
    },
    {
      text: "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
      fontSize: FONT.tableSmall,
      bold: true,
      margin: [0, 4, 0, 6],
      lineHeight: 1.1,
    },
    {
      text: company.representanteNome.toUpperCase(),
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: company.representanteRg,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: company.representanteCpf,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`,
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
      margin: [0, 0, 0, 8],
    },
    {
      text: STANDARD_DIGITAL_SIGNATURE_NOTICE,
      fontSize: FONT.tableSmall,
      alignment: "center" as const,
      lineHeight: 1.1,
      margin: [0, 6, 0, 0],
    },
  ];
}

function buildBaseStyles(): TDocumentDefinitions["styles"] {
  return {
    companyName: {
      fontSize: FONT.companyName,
      bold: true,
      alignment: "center",
      lineHeight: 1.1,
      margin: [0, 0, 0, 2],
    },
    companyDetail: {
      fontSize: FONT.companyDetail,
      alignment: "center",
      lineHeight: 1.1,
      margin: [0, 0, 0, 1],
    },
    referencia: {
      fontSize: FONT.companyDetail,
      alignment: "center",
      margin: [0, 6, 0, 4],
    },
    title: {
      fontSize: FONT.title,
      bold: true,
      alignment: "center",
      margin: [0, 2, 0, 10],
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
    { text: sanitize(header[4] ?? header[3]), style: "companyDetail", margin: [0, 2, 0, 0] },
    { text: sanitize(pkg.metadata.referencia.toUpperCase()), style: "referencia" },
    { text: "PROPOSTA COMERCIAL DE PREÇOS", style: "title" },
    ...buildMetadataSection(pkg, company),
    buildItemsTable(pkg),
    ...buildConditionsSection(pkg),
    ...buildDeclarationsSection(),
    ...buildSignatureSection(company),
  ];

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
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
    { text: sanitize(header[4] ?? header[3]), style: "companyDetail", margin: [0, 2, 0, 0] },
    { text: "DECLARAÇÕES", style: "title" },
    labeledLine("À", pkg.metadata.orgao),
    labeledLine("OBJETO:", pkg.metadata.objeto),
    labeledLine("PROCESSO:", pkg.metadata.processo),
    {
      text: sanitize(pkg.metadata.referencia.toUpperCase()),
      fontSize: FONT.table,
      margin: [0, 0, 0, 8],
    },
    {
      text: STANDARD_DIGITAL_SIGNATURE_NOTICE,
      fontSize: FONT.tableSmall,
      margin: [0, 0, 0, 10],
      lineHeight: 1.1,
    },
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    content.push(
      grayBar(section.titulo.toUpperCase()),
      ...formatDeclarationLines(section.conteudo).map((line) => ({
        text: sanitize(line),
        fontSize: FONT.table,
        lineHeight: 1.15,
        margin: [0, 0, 0, 3] as [number, number, number, number],
      }))
    );
  }

  content.push(...buildSignatureSection(company));

  return {
    pageSize: "A4",
    pageMargins: [36, 36, 36, 36],
    defaultStyle: { font: "Roboto", fontSize: FONT.body, lineHeight: FONT.lineHeight },
    styles: buildBaseStyles(),
    content,
  };
}
