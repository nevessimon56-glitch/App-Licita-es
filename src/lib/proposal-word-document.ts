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
  WidthType,
} from "docx";
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
  text: "000000",
  headerBg: "D9D9D9",
  border: "000000",
};

const PAGE_MARGINS = {
  top: 900,
  right: 900,
  bottom: 900,
  left: 900,
};

function textRun(
  text: string,
  options?: { bold?: boolean; size?: number }
): TextRun {
  return new TextRun({
    text,
    bold: options?.bold,
    size: options?.size ?? 18,
    color: COLORS.text,
    font: "Arial",
  });
}

function paragraph(
  text: string,
  options?: {
    bold?: boolean;
    alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    spacingBefore?: number;
  }
): Paragraph {
  return new Paragraph({
    alignment: options?.alignment,
    spacing: {
      after: options?.spacingAfter ?? 80,
      before: options?.spacingBefore ?? 0,
    },
    children: [textRun(text, { bold: options?.bold })],
  });
}

function labelParagraph(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      textRun(`${label}: `, { bold: true }),
      textRun(value.toUpperCase()),
    ],
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

function tableCell(
  content: string,
  options?: { bold?: boolean; shading?: boolean; widthPct?: number }
): TableCell {
  return new TableCell({
    width: options?.widthPct
      ? { size: options.widthPct, type: WidthType.PERCENTAGE }
      : undefined,
    borders: cellBorders(),
    shading: options?.shading
      ? { type: ShadingType.CLEAR, fill: COLORS.headerBg }
      : undefined,
    children: [
      new Paragraph({
        children: [textRun(content, { bold: options?.bold })],
      }),
    ],
  });
}

function multilineCell(content: string, options?: { bold?: boolean }): TableCell {
  const lines = content.split("\n");
  return new TableCell({
    borders: cellBorders(),
    children: lines.map(
      (line) =>
        new Paragraph({
          children: [textRun(line, { bold: options?.bold })],
        })
    ),
  });
}

function buildItemsTable(pkg: ProposalPackage): Table {
  const rows = buildProposalItemRows(pkg);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: PROPOSAL_TABLE_HEADERS.map((header) =>
          tableCell(header, { bold: true, shading: true })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              tableCell(row.numero),
              multilineCell(row.especificacao),
              tableCell(row.quantidade),
              tableCell(row.marcaModelo),
              tableCell(row.valorUnitario),
              tableCell(row.valorTotal),
            ],
          })
      ),
    ],
  });
}

function buildSignatureParagraphs(company: CompanyProfile): Paragraph[] {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";

  return [
    paragraph(
      `DATA: ${company.assinaturaCidade.toUpperCase()} - [DIA] DE [MÊS] DE [ANO].`
    ),
    labelParagraph("NOME", company.representanteNome),
    paragraph(`RG SOB Nº ${company.representanteRg}`),
    paragraph(`CPF SOB Nº ${company.representanteCpf}`),
    paragraph(""),
    paragraph(
      "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:",
      { bold: true }
    ),
    paragraph(company.representanteNome.toUpperCase()),
    paragraph(company.representanteRg),
    paragraph(company.representanteCpf),
    paragraph(
      `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`
    ),
  ];
}

export function buildProposalWordDocument(
  pkg: ProposalPackage,
  company: CompanyProfile
): Document {
  const header = buildProposalCompanyHeader(company);
  const total = getProposalGrandTotalFormatted(pkg);

  return new Document({
    creator: "App Licitações",
    title: `Proposta ${pkg.metadata.orgao}`,
    sections: [
      {
        properties: { page: { margin: PAGE_MARGINS } },
        children: [
          ...header.map((line) =>
            paragraph(line, { alignment: AlignmentType.CENTER, spacingAfter: 40 })
          ),
          paragraph(pkg.metadata.referencia.toUpperCase(), {
            alignment: AlignmentType.CENTER,
            spacingBefore: 120,
          }),
          paragraph("PROPOSTA COMERCIAL DE PREÇOS", {
            bold: true,
            alignment: AlignmentType.CENTER,
            spacingBefore: 120,
            spacingAfter: 160,
          }),
          labelParagraph("ORGÃO", pkg.metadata.orgao),
          labelParagraph("OBJETO", pkg.metadata.objeto),
          labelParagraph("PROCESSO", pkg.metadata.processo),
          paragraph("INFORMAÇÕES:", { bold: true, spacingBefore: 120 }),
          labelParagraph("ENDEREÇO DO ÓRGÃO", pkg.metadata.enderecoOrgao),
          labelParagraph("CRITERIO DE JULGAMENTO", pkg.metadata.criterioJulgamento),
          labelParagraph("HORARIO", pkg.metadata.horarioSessao),
          paragraph(
            `DADOS BANCARIOS: ${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`,
            { spacingBefore: 120 }
          ),
          buildItemsTable(pkg),
          paragraph(
            `VALOR TOTAL: ${total}    ${(pkg.valorTotalExtenso || "[PREENCHER POR EXTENSO]").toUpperCase()}.`,
            { bold: true, spacingBefore: 120 }
          ),
          paragraph("CONDIÇÕES COMERCIAIS DA PROPOSTA:", {
            bold: true,
            spacingBefore: 160,
          }),
          labelParagraph("VALIDADE", pkg.condicoesComerciais.validade),
          labelParagraph("GARANTIA", pkg.condicoesComerciais.garantia),
          labelParagraph("ENTREGA", pkg.condicoesComerciais.entrega),
          labelParagraph("VIGÊNCIA", pkg.condicoesComerciais.vigencia),
          labelParagraph("PAGAMENTO", pkg.condicoesComerciais.pagamento),
          ...(pkg.metadata.lote.trim()
            ? [paragraph(pkg.metadata.lote.toUpperCase(), { spacingBefore: 120 })]
            : []),
          paragraph("DECLARAÇÕES DA PROPOSTA:", { bold: true, spacingBefore: 160 }),
          ...STANDARD_DECLARACOES_PROPOSTA.split("\n").map((line) =>
            paragraph(line, { spacingAfter: 40 })
          ),
          paragraph(STANDARD_DIGITAL_SIGNATURE_NOTICE, { spacingBefore: 120 }),
          ...buildSignatureParagraphs(company),
        ],
      },
    ],
  });
}

export function buildDeclarationsWordDocument(
  pkg: ProposalPackage,
  company: CompanyProfile
): Document {
  const header = buildProposalCompanyHeader(company);

  const children: (Paragraph | Table)[] = [
    ...header.map((line) =>
      paragraph(line, { alignment: AlignmentType.CENTER, spacingAfter: 40 })
    ),
    paragraph("DECLARAÇÕES", {
      bold: true,
      alignment: AlignmentType.CENTER,
      spacingBefore: 160,
      spacingAfter: 120,
    }),
    paragraph(`À ${pkg.metadata.orgao.toUpperCase()}`),
    labelParagraph("OBJETO", pkg.metadata.objeto),
    labelParagraph("PROCESSO", pkg.metadata.processo),
    paragraph(pkg.metadata.referencia.toUpperCase()),
    paragraph(STANDARD_DIGITAL_SIGNATURE_NOTICE, { spacingBefore: 120 }),
  ];

  for (const section of pkg.declaracoesHabilitacao) {
    children.push(
      paragraph(section.titulo.toUpperCase(), { bold: true, spacingBefore: 200 }),
      ...section.conteudo.split("\n").map((line) => paragraph(line, { spacingAfter: 40 }))
    );
  }

  children.push(...buildSignatureParagraphs(company));

  return new Document({
    creator: "App Licitações",
    title: `Declarações ${pkg.metadata.orgao}`,
    sections: [{ properties: { page: { margin: PAGE_MARGINS } }, children }],
  });
}
