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
  PROPOSAL_SEM_INSTALACAO_COLOR,
  PROPOSAL_SEM_INSTALACAO_SUFFIX,
  PROPOSAL_SIGNATURE_SPACE_WORD,
  PROPOSAL_WORD_FONT,
  formatConditionForExport,
  formatDeclarationLines,
  formatSpecificationForExport,
  shouldShowLote,
} from "./proposal-export-styles";
import {
  STANDARD_DECLARACOES_PROPOSTA,
} from "./proposal-template";
import {
  PROPOSAL_TABLE_HEADERS,
  buildProposalCompanyHeader,
  buildProposalItemRows,
  getProposalGrandTotalFormatted,
  getValorTotalExtenso,
  type ProposalItemRow,
} from "./proposal-layout";
import { formatProposalSignatureDate } from "./proposal-export-layout";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const COLORS = PROPOSAL_EXPORT_COLORS;
const FONT = PROPOSAL_WORD_FONT;
const PAGE_MARGINS = { top: 850, right: 850, bottom: 850, left: 850 };

function textRun(
  text: string,
  options?: { bold?: boolean; size?: number; color?: string }
): TextRun {
  return new TextRun({
    text,
    bold: options?.bold,
    size: options?.size ?? FONT.body,
    color: options?.color ?? COLORS.text,
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

function compactMargins() {
  return { top: 40, bottom: 40, left: 60, right: 60 };
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
      line: options?.lineSpacing ?? 240,
    },
    children: [textRun(text, { bold: options?.bold, size: options?.size ?? FONT.body })],
  });
}

function labeledParagraph(label: string, value: string, size: number = FONT.table): Paragraph {
  return new Paragraph({
    spacing: { after: 40, line: 220 },
    children: [
      textRun(`${label} `, { bold: true, size }),
      textRun(formatConditionForExport(value), { size }),
    ],
  });
}

function grayBarParagraph(
  title: string,
  spacingBefore = 100,
  size: number = FONT.table
): Paragraph {
  return new Paragraph({
    spacing: { before: spacingBefore, after: 40, line: 220 },
    shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
    border: cellBorders(),
    children: [textRun(title, { bold: true, size })],
  });
}

function buildCompanyHeaderBlock(company: CompanyProfile): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const lines = buildProposalCompanyHeader(company).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isName = i === 0;

    if (line.startsWith("ENDEREÇO:") && line.includes("MUNICÍPIO:")) {
      const splitAt = line.indexOf("MUNICÍPIO:");
      paragraphs.push(
        bodyParagraph(line.slice(0, splitAt).trim(), {
          alignment: AlignmentType.CENTER,
          size: FONT.companyDetail,
          spacingAfter: 20,
        }),
        bodyParagraph(line.slice(splitAt).trim(), {
          alignment: AlignmentType.CENTER,
          size: FONT.companyDetail,
          spacingAfter: 20,
        })
      );
      continue;
    }

    paragraphs.push(
      bodyParagraph(line, {
        alignment: AlignmentType.CENTER,
        bold: isName,
        size: isName ? FONT.companyName : FONT.companyDetail,
        spacingAfter: isName ? 40 : 20,
        lineSpacing: 240,
      })
    );
  }

  return paragraphs;
}

function marcaModeloParagraph(row: ProposalItemRow): Paragraph {
  if (!row.semInstalacao) {
    return bodyParagraph(row.marcaModelo, { size: FONT.table, lineSpacing: 240 });
  }

  return new Paragraph({
    spacing: { line: 240 },
    children: [
      textRun(row.marcaModeloBase, { size: FONT.table }),
      textRun(PROPOSAL_SEM_INSTALACAO_SUFFIX, {
        size: FONT.table,
        color: PROPOSAL_SEM_INSTALACAO_COLOR,
        bold: true,
      }),
    ],
  });
}

function buildBankBarTable(company: CompanyProfile): Table {
  const bankDetails = `${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`;

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 22, type: WidthType.PERCENTAGE },
            borders: cellBorders(),
            margins: compactMargins(),
            shading: { type: ShadingType.CLEAR, fill: "C0C0C0" },
            children: [bodyParagraph("DADOS BANCARIOS:", { bold: true, size: FONT.table })],
          }),
          new TableCell({
            width: { size: 78, type: WidthType.PERCENTAGE },
            borders: cellBorders(),
            margins: compactMargins(),
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            children: [bodyParagraph(bankDetails, { size: FONT.table })],
          }),
        ],
      }),
    ],
  });
}

function buildMetadataBlock(pkg: ProposalPackage, company: CompanyProfile): (Paragraph | Table)[] {
  return [
    labeledParagraph("ORGÃO:", pkg.metadata.orgao),
    labeledParagraph("OBJETO:", pkg.metadata.objeto),
    labeledParagraph("PROCESSO:", pkg.metadata.processo),
    labeledParagraph("ENDEREÇO DO ÓRGÃO:", pkg.metadata.enderecoOrgao),
    labeledParagraph("CRITERIO DE JULGAMENTO:", pkg.metadata.criterioJulgamento),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 80, line: 240 },
      children: [
        textRun("HORARIO: ", { bold: true, size: FONT.table }),
        textRun(formatConditionForExport(pkg.metadata.horarioSessao), { size: FONT.table }),
      ],
    }),
    buildBankBarTable(company),
  ];
}

function buildItemsTable(pkg: ProposalPackage): Table {
  const rows = buildProposalItemRows(pkg);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: PROPOSAL_TABLE_HEADERS.map((header) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            borders: cellBorders(),
            margins: compactMargins(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              bodyParagraph(header, {
                bold: true,
                size: FONT.tableSmall,
                alignment: AlignmentType.CENTER,
              }),
            ],
          })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [bodyParagraph(row.numero, { size: FONT.table })],
              }),
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [
                  bodyParagraph(formatSpecificationForExport(row.especificacao), {
                    size: FONT.table,
                    lineSpacing: 240,
                  }),
                ],
              }),
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [
                  bodyParagraph(row.quantidade, { bold: true, size: FONT.table }),
                ],
              }),
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [marcaModeloParagraph(row)],
              }),
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [
                  bodyParagraph(row.valorUnitario, {
                    size: FONT.table,
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
              new TableCell({
                borders: cellBorders(),
                margins: compactMargins(),
                children: [
                  bodyParagraph(row.valorTotal, {
                    bold: true,
                    size: FONT.table,
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
              }),
            ],
          })
      ),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            borders: cellBorders(),
            margins: compactMargins(),
            children: [
              new Paragraph({
                spacing: { line: 240 },
                children: [
                  textRun("VALOR TOTAL: ", { bold: true, size: FONT.table }),
                  textRun(getValorTotalExtenso(pkg), { size: FONT.table }),
                ],
              }),
            ],
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
            borders: cellBorders(),
            margins: compactMargins(),
            verticalAlign: VerticalAlign.CENTER,
            children: [
              bodyParagraph(getProposalGrandTotalFormatted(pkg), {
                bold: true,
                size: FONT.totalAmount,
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function buildConditionsBlock(pkg: ProposalPackage): Paragraph[] {
  const paragraphs: Paragraph[] = [
    grayBarParagraph("CONDIÇÕES COMERCIAIS DA PROPOSTA:"),
    labeledParagraph("VALIDADE:", pkg.condicoesComerciais.validade),
    labeledParagraph("GARANTIA:", pkg.condicoesComerciais.garantia),
    labeledParagraph("ENTREGA:", pkg.condicoesComerciais.entrega),
    labeledParagraph("VIGÊNCIA:", pkg.condicoesComerciais.vigencia),
    labeledParagraph("PAGAMENTO:", pkg.condicoesComerciais.pagamento),
  ];

  if (shouldShowLote(pkg.metadata.lote)) {
    paragraphs.push(
      bodyParagraph(formatConditionForExport(pkg.metadata.lote), {
        size: FONT.table,
        spacingBefore: 40,
      })
    );
  }

  return paragraphs;
}

function buildDeclarationsBlock(): Paragraph[] {
  return [
    grayBarParagraph("DECLARAÇÕES DA PROPOSTA:"),
    ...formatDeclarationLines(STANDARD_DECLARACOES_PROPOSTA).map((line) =>
      bodyParagraph(line, { size: FONT.table, spacingAfter: 40, lineSpacing: 260 })
    ),
  ];
}

function buildSignatureBlock(company: CompanyProfile): Paragraph[] {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";
  const signatureFont = FONT.tableSmall;

  return [
    bodyParagraph(formatProposalSignatureDate(company.assinaturaCidade), {
      alignment: AlignmentType.CENTER,
      size: signatureFont,
      spacingBefore: 100,
      spacingAfter: 60,
      lineSpacing: 220,
    }),
    grayBarParagraph(
      "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
      0,
      signatureFont
    ),
    labeledParagraph("NOME:", company.representanteNome, signatureFont),
    bodyParagraph(`RG SOB Nº ${company.representanteRg}`, {
      size: signatureFont,
      spacingAfter: 20,
      lineSpacing: 220,
    }),
    bodyParagraph(`CPF SOB Nº ${company.representanteCpf}`, {
      size: signatureFont,
      spacingAfter: 20,
      lineSpacing: 220,
    }),
    bodyParagraph(
      `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`,
      { size: signatureFont, lineSpacing: 220, spacingAfter: 40 }
    ),
    bodyParagraph("", { spacingAfter: PROPOSAL_SIGNATURE_SPACE_WORD }),
  ];
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
          bodyParagraph("PROPOSTA COMERCIAL DE PREÇOS", {
            alignment: AlignmentType.CENTER,
            bold: true,
            size: FONT.title,
            spacingBefore: 80,
            spacingAfter: 120,
          }),
          ...buildMetadataBlock(pkg, company),
          bodyParagraph("", { spacingAfter: 80 }),
          buildItemsTable(pkg),
          bodyParagraph("", { spacingAfter: 80 }),
          ...buildConditionsBlock(pkg),
          bodyParagraph("", { spacingAfter: 80 }),
          ...buildDeclarationsBlock(),
          ...buildSignatureBlock(company),
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
    bodyParagraph("DECLARAÇÕES", {
      alignment: AlignmentType.CENTER,
      bold: true,
      size: FONT.title,
      spacingBefore: 120,
      spacingAfter: 120,
    }),
    labeledParagraph("À", pkg.metadata.orgao),
    labeledParagraph("OBJETO:", pkg.metadata.objeto),
    labeledParagraph("PROCESSO:", pkg.metadata.processo),
    bodyParagraph(pkg.metadata.referencia.toUpperCase(), { size: FONT.table, spacingAfter: 80 }),
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    children.push(
      grayBarParagraph(section.titulo.toUpperCase()),
      ...formatDeclarationLines(section.conteudo).map((line) =>
        bodyParagraph(line, { size: FONT.table, spacingAfter: 40, lineSpacing: 260 })
      )
    );
  }

  children.push(...buildSignatureBlock(company));

  return new Document({
    creator: "App Licitações",
    title: `Declarações ${pkg.metadata.orgao}`,
    sections: [{ properties: { page: { margin: PAGE_MARGINS } }, children }],
  });
}
