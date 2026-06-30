import {
  AlignmentType,
  BorderStyle,
  Document,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import {
  PROPOSAL_EXPORT_COLORS,
  PROPOSAL_WORD_FONT,
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

const COLORS = PROPOSAL_EXPORT_COLORS;
const FONT = PROPOSAL_WORD_FONT;

const PAGE_MARGINS = { top: 850, right: 850, bottom: 850, left: 850 };

function textRun(
  text: string,
  options?: { bold?: boolean; size?: number }
): TextRun {
  return new TextRun({
    text,
    bold: options?.bold,
    size: options?.size ?? FONT.body,
    color: COLORS.text,
    font: FONT.family,
  });
}

function cellBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
    left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
    right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
  };
}

function cellMargins() {
  return { top: 100, bottom: 100, left: 110, right: 110 };
}

function bodyParagraph(
  text: string,
  options?: {
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    size?: number;
    spacingAfter?: number;
    spacingBefore?: number;
    lineSpacing?: number;
  }
): Paragraph {
  return new Paragraph({
    alignment: options?.alignment,
    spacing: {
      after: options?.spacingAfter ?? 0,
      before: options?.spacingBefore ?? 0,
      line: options?.lineSpacing ?? 276,
    },
    children: [
      textRun(text, { bold: options?.bold, size: options?.size ?? FONT.body }),
    ],
  });
}

function linesParagraph(
  lines: string[],
  options?: { size?: number; lineSpacing?: number }
): Paragraph[] {
  return lines.map((line, index) =>
    bodyParagraph(line, {
      size: options?.size ?? FONT.table,
      lineSpacing: options?.lineSpacing ?? 300,
      spacingAfter: index === lines.length - 1 ? 0 : 60,
    })
  );
}

function grayCell(
  children: Paragraph[],
  options?: { widthPct?: number; columnSpan?: number }
): TableCell {
  return new TableCell({
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    columnSpan: options?.columnSpan,
    shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
    borders: cellBorders(),
    margins: cellMargins(),
    verticalAlign: VerticalAlign.CENTER,
    children,
  });
}

function whiteCell(
  children: Paragraph[],
  options?: { widthPct?: number; columnSpan?: number }
): TableCell {
  return new TableCell({
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    columnSpan: options?.columnSpan,
    borders: cellBorders(),
    margins: cellMargins(),
    verticalAlign: VerticalAlign.TOP,
    children,
  });
}

function labelValueRow(label: string, value: string, labelWidth = 24): TableRow {
  return new TableRow({
    children: [
      grayCell([bodyParagraph(label, { bold: true, size: FONT.table })] , {
        widthPct: labelWidth,
      }),
      whiteCell(linesParagraph(formatConditionLines(value), { size: FONT.table }), {
        widthPct: 100 - labelWidth,
      }),
    ],
  });
}

function sectionHeaderRow(title: string, columns = 2): TableRow {
  return new TableRow({
    children: [
      grayCell(
        [
          bodyParagraph(title, {
            bold: true,
            size: FONT.table,
            alignment: AlignmentType.CENTER,
          }),
        ],
        { columnSpan: columns }
      ),
    ],
  });
}

function fullWidthRow(text: string, shaded = false): TableRow {
  return new TableRow({
    children: [
      shaded
        ? grayCell([bodyParagraph(text, { size: FONT.table })], { columnSpan: 2 })
        : whiteCell([bodyParagraph(text, { size: FONT.table })], { columnSpan: 2 }),
    ],
  });
}

function buildCompanyHeaderBlock(company: CompanyProfile): Paragraph[] {
  const lines = buildProposalCompanyHeader(company);
  return lines.map((line, index) => {
    if (!line) {
      return bodyParagraph("", { spacingAfter: 40 });
    }
    const isName = index === 0;
    return bodyParagraph(line, {
      alignment: AlignmentType.CENTER,
      bold: isName,
      size: isName ? FONT.companyName : FONT.companyDetail,
      spacingAfter: isName ? 50 : 30,
      lineSpacing: 260,
    });
  });
}

function buildMetadataTable(pkg: ProposalPackage, company: CompanyProfile): Table {
  const bankLine = `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labelValueRow("ORGÃO:", pkg.metadata.orgao),
      labelValueRow("OBJETO:", pkg.metadata.objeto),
      labelValueRow("PROCESSO:", pkg.metadata.processo),
      sectionHeaderRow("INFORMAÇÕES"),
      labelValueRow("ENDEREÇO DO ÓRGÃO", pkg.metadata.enderecoOrgao),
      labelValueRow("CRITERIO DE JULGAMENTO", pkg.metadata.criterioJulgamento),
      labelValueRow("HORARIO", pkg.metadata.horarioSessao),
      fullWidthRow(bankLine, true),
    ],
  });
}

function buildItemsTable(pkg: ProposalPackage): Table {
  const rows = buildProposalItemRows(pkg);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: PROPOSAL_TABLE_HEADERS.map((header, index) =>
          grayCell(
            [
              bodyParagraph(header, {
                bold: true,
                size: FONT.tableSmall,
                alignment: AlignmentType.CENTER,
              }),
            ],
            { widthPct: index === 1 ? 34 : undefined }
          )
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              whiteCell([bodyParagraph(row.numero, { size: FONT.table })], {
                widthPct: 5,
              }),
              whiteCell(
                linesParagraph(formatSpecificationLines(row.especificacao), {
                  size: FONT.table,
                  lineSpacing: 320,
                }),
                { widthPct: 34 }
              ),
              whiteCell(
                [
                  bodyParagraph(row.quantidade, {
                    bold: true,
                    size: FONT.table,
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                { widthPct: 6 }
              ),
              whiteCell(
                linesParagraph(formatConditionLines(row.marcaModelo), {
                  size: FONT.table,
                }),
                { widthPct: 22 }
              ),
              whiteCell(
                [
                  bodyParagraph(row.valorUnitario, {
                    size: FONT.table,
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                { widthPct: 14 }
              ),
              whiteCell(
                [
                  bodyParagraph(row.valorTotal, {
                    bold: true,
                    size: FONT.table,
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                { widthPct: 14 }
              ),
            ],
          })
      ),
      new TableRow({
        children: [
          grayCell(
            [
              bodyParagraph("VALOR TOTAL:", { bold: true, size: FONT.table }),
              ...linesParagraph([getValorTotalExtenso(pkg)], {
                size: FONT.table,
                lineSpacing: 300,
              }),
            ],
            { columnSpan: 5 }
          ),
          grayCell(
            [
              bodyParagraph(getProposalGrandTotalFormatted(pkg), {
                bold: true,
                size: FONT.totalAmount,
                alignment: AlignmentType.CENTER,
              }),
            ],
            { widthPct: 14 }
          ),
        ],
      }),
    ],
  });
}

function buildConditionsTable(pkg: ProposalPackage): Table {
  const rows: TableRow[] = [
    sectionHeaderRow("CONDIÇÕES COMERCIAIS DA PROPOSTA:"),
    labelValueRow("VALIDADE:", pkg.condicoesComerciais.validade),
    labelValueRow("GARANTIA:", pkg.condicoesComerciais.garantia),
    labelValueRow("ENTREGA:", pkg.condicoesComerciais.entrega),
    labelValueRow("VIGÊNCIA:", pkg.condicoesComerciais.vigencia),
    labelValueRow("PAGAMENTO:", pkg.condicoesComerciais.pagamento),
  ];

  if (pkg.metadata.lote.trim()) {
    rows.push(fullWidthRow(pkg.metadata.lote.toUpperCase()));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function buildDeclarationsTable(): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      sectionHeaderRow("DECLARAÇÕES DA PROPOSTA:"),
      new TableRow({
        children: [
          whiteCell(
            formatDeclarationLines(STANDARD_DECLARACOES_PROPOSTA).flatMap((line) =>
              linesParagraph([line], { size: FONT.table, lineSpacing: 320 })
            ),
            { columnSpan: 2 }
          ),
        ],
      }),
    ],
  });
}

function buildSignatureTable(company: CompanyProfile): Table {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          whiteCell(
            [
              bodyParagraph(
                `DATA: ${company.assinaturaCidade.toUpperCase()} - [DIA] DE [MÊS] DE [ANO].`,
                { alignment: AlignmentType.CENTER, size: FONT.table }
              ),
              bodyParagraph(`NOME: ${company.representanteNome.toUpperCase()}`, {
                size: FONT.table,
                spacingBefore: 120,
              }),
              bodyParagraph(`RG SOB Nº ${company.representanteRg}`, { size: FONT.table }),
              bodyParagraph(`CPF SOB Nº ${company.representanteCpf}`, { size: FONT.table }),
            ],
            { columnSpan: 2 }
          ),
        ],
      }),
      sectionHeaderRow(
        "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:"
      ),
      new TableRow({
        children: [
          whiteCell(
            [
              bodyParagraph(company.representanteNome.toUpperCase(), { size: FONT.table }),
              bodyParagraph(company.representanteRg, { size: FONT.table }),
              bodyParagraph(company.representanteCpf, { size: FONT.table }),
              bodyParagraph(
                `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`,
                { size: FONT.table, lineSpacing: 300 }
              ),
            ],
            { columnSpan: 2 }
          ),
        ],
      }),
      new TableRow({
        children: [
          whiteCell(
            [
              bodyParagraph(STANDARD_DIGITAL_SIGNATURE_NOTICE, {
                size: FONT.tableSmall,
                alignment: AlignmentType.CENTER,
                lineSpacing: 300,
              }),
            ],
            { columnSpan: 2 }
          ),
        ],
      }),
    ],
  });
}

function spacer(after = 120): Paragraph {
  return bodyParagraph("", { spacingAfter: after });
}

export function buildProposalWordDocument(
  pkg: ProposalPackage,
  company: CompanyProfile
): Document {
  return new Document({
    creator: "App Licitações",
    title: `Proposta ${pkg.metadata.orgao}`,
    sections: [
      {
        properties: { page: { margin: PAGE_MARGINS } },
        children: [
          ...buildCompanyHeaderBlock(company),
          spacer(80),
          bodyParagraph(pkg.metadata.referencia.toUpperCase(), {
            alignment: AlignmentType.CENTER,
            size: FONT.companyDetail,
            spacingAfter: 100,
          }),
          bodyParagraph("PROPOSTA COMERCIAL DE PREÇOS", {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: FONT.title,
            spacingAfter: 160,
          }),
          buildMetadataTable(pkg, company),
          spacer(100),
          buildItemsTable(pkg),
          spacer(100),
          buildConditionsTable(pkg),
          spacer(100),
          buildDeclarationsTable(),
          spacer(80),
          buildSignatureTable(company),
        ],
      },
    ],
  });
}

export function buildDeclarationsWordDocument(
  pkg: ProposalPackage,
  company: CompanyProfile
): Document {
  const children: (Paragraph | Table)[] = [
    ...buildCompanyHeaderBlock(company),
    spacer(120),
    bodyParagraph("DECLARAÇÕES", {
      alignment: AlignmentType.CENTER,
      bold: true,
      size: FONT.title,
      spacingAfter: 140,
    }),
    buildMetadataTable(pkg, company),
    spacer(100),
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          sectionHeaderRow(section.titulo.toUpperCase()),
          new TableRow({
            children: [
              whiteCell(
                formatDeclarationLines(section.conteudo).flatMap((line) =>
                  linesParagraph([line], { size: FONT.table, lineSpacing: 320 })
                ),
                { columnSpan: 2 }
              ),
            ],
          }),
        ],
      }),
      spacer(80)
    );
  }

  children.push(buildSignatureTable(company));

  return new Document({
    creator: "App Licitações",
    title: `Declarações ${pkg.metadata.orgao}`,
    sections: [{ properties: { page: { margin: PAGE_MARGINS } }, children }],
  });
}
