import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  buildCompanyHeaderContent,
  buildMetadataContent,
  buildSignatureContent,
  labeledLine,
  sectionGrayBar,
  tableLayout,
} from "./proposal-export-layout";
import {
  PROPOSAL_PDF_COLORS,
  PROPOSAL_PDF_FONT,
  PROPOSAL_SEM_INSTALACAO_COLOR_PDF,
  PROPOSAL_SEM_INSTALACAO_SUFFIX,
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
  buildProposalItemRows,
  getProposalGrandTotalFormatted,
  getValorTotalExtenso,
} from "./proposal-layout";
import type { ProposalItemRow } from "./proposal-layout";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const COLORS = PROPOSAL_PDF_COLORS;
const FONT = PROPOSAL_PDF_FONT;

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
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
              { text: sanitize(getValorTotalExtenso(pkg)), fontSize: FONT.table },
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
    layout: tableLayout(),
    margin: [0, 0, 0, 8],
  };
}

function buildConditionsSection(pkg: ProposalPackage): Content[] {
  const items: Content[] = [
    sectionGrayBar("CONDIÇÕES COMERCIAIS DA PROPOSTA:"),
    labeledLine("VALIDADE:", pkg.condicoesComerciais.validade),
    labeledLine("GARANTIA:", pkg.condicoesComerciais.garantia),
    labeledLine("ENTREGA:", pkg.condicoesComerciais.entrega),
    labeledLine("VIGÊNCIA:", pkg.condicoesComerciais.vigencia),
    labeledLine("PAGAMENTO:", pkg.condicoesComerciais.pagamento),
  ];

  if (shouldShowLote(pkg.metadata.lote)) {
    items.push({
      text: sanitize(pkg.metadata.lote.toUpperCase()),
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
      margin: [0, 0, 0, 4],
    });
  }

  return items;
}

function buildDeclarationsSection(): Content[] {
  return [
    sectionGrayBar("DECLARAÇÕES DA PROPOSTA:"),
    ...formatDeclarationLines(STANDARD_DECLARACOES_PROPOSTA).map((line) => ({
      text: sanitize(line),
      fontSize: FONT.table,
      lineHeight: 1.12,
      margin: [0, 0, 0, 2] as [number, number, number, number],
    })),
  ];
}

function buildBaseStyles(): TDocumentDefinitions["styles"] {
  return {
    companyName: {
      fontSize: FONT.companyName,
      bold: true,
      alignment: "center",
      lineHeight: 1.08,
      margin: [0, 0, 0, 1],
    },
    companyDetail: {
      fontSize: FONT.companyDetail,
      alignment: "center",
      lineHeight: 1.08,
      margin: [0, 0, 0, 1],
    },
    title: {
      fontSize: FONT.title,
      bold: true,
      alignment: "center",
      margin: [0, 8, 0, 10],
    },
  };
}

export function buildProposalPdfDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile
): TDocumentDefinitions {
  const content: Content[] = [
    ...buildCompanyHeaderContent(company),
    { text: "PROPOSTA COMERCIAL DE PREÇOS", style: "title" },
    ...buildMetadataContent(pkg, company),
    buildItemsTable(pkg),
    ...buildConditionsSection(pkg),
    ...buildDeclarationsSection(),
    ...buildSignatureContent(company, STANDARD_DIGITAL_SIGNATURE_NOTICE),
  ];

  return {
    pageSize: "A4",
    pageMargins: [40, 36, 40, 36],
    defaultStyle: { font: "Roboto", fontSize: FONT.body, lineHeight: FONT.lineHeight },
    styles: buildBaseStyles(),
    content,
  };
}

export function buildDeclarationsPdfDefinition(
  pkg: ProposalPackage,
  company: CompanyProfile
): TDocumentDefinitions {
  const content: Content[] = [
    ...buildCompanyHeaderContent(company),
    { text: "DECLARAÇÕES", style: "title" },
    labeledLine("À", pkg.metadata.orgao),
    labeledLine("OBJETO:", pkg.metadata.objeto),
    labeledLine("PROCESSO:", pkg.metadata.processo),
    {
      text: sanitize(pkg.metadata.referencia.toUpperCase()),
      fontSize: FONT.table,
      margin: [0, 0, 0, 8],
    },
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    content.push(
      sectionGrayBar(section.titulo.toUpperCase()),
      ...formatDeclarationLines(section.conteudo).map((line) => ({
        text: sanitize(line),
        fontSize: FONT.table,
        lineHeight: 1.12,
        margin: [0, 0, 0, 2] as [number, number, number, number],
      }))
    );
  }

  content.push(...buildSignatureContent(company, STANDARD_DIGITAL_SIGNATURE_NOTICE));

  return {
    pageSize: "A4",
    pageMargins: [40, 36, 40, 36],
    defaultStyle: { font: "Roboto", fontSize: FONT.body, lineHeight: FONT.lineHeight },
    styles: buildBaseStyles(),
    content,
  };
}
