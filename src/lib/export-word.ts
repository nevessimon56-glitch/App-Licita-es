import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";
import type { AnalysisResponse } from "./analysis-prompt";
import { parseMarkdownToBlocks, buildExportFilename, downloadBlob } from "./markdown-blocks";

function buildMetadataParagraphs(result: AnalysisResponse): Paragraph[] {
  const generatedDate = new Date(result.generatedAt).toLocaleString("pt-BR");
  const docs = result.documentSummary
    .map((d) => `${d.name} (${d.pageCount} páginas)`)
    .join("; ");

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: "APP LICITAÇÕES",
          bold: true,
          size: 28,
          color: "1E40AF",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: "Resumo Executivo de Licitação Pública",
          size: 24,
          color: "334155",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "DBEAFE" },
      },
      children: [
        new TextRun({ text: `Gerado em: ${generatedDate}`, size: 20, color: "64748B" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: `Modelo: ${result.model}`, size: 20, color: "64748B" }),
      ],
    }),
    new Paragraph({
      spacing: { after: 300 },
      children: [
        new TextRun({ text: `Documentos analisados: ${docs}`, size: 20, color: "64748B" }),
      ],
    }),
  ];
}

function blocksToParagraphs(
  blocks: ReturnType<typeof parseMarkdownToBlocks>
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 360, after: 160 },
            children: [
              new TextRun({ text: block.text, bold: true, size: 28, color: "1E3A8A" }),
            ],
          })
        );
        break;
      case "h3":
        paragraphs.push(
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({ text: block.text, bold: true, size: 24, color: "1E293B" }),
            ],
          })
        );
        break;
      case "paragraph":
        paragraphs.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: block.text, size: 22 })],
          })
        );
        break;
      case "list":
        for (const item of block.items) {
          paragraphs.push(
            new Paragraph({
              spacing: { after: 80 },
              bullet: { level: 0 },
              children: [new TextRun({ text: item, size: 22 })],
            })
          );
        }
        break;
      case "checkbox":
        for (const item of block.items) {
          paragraphs.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [new TextRun({ text: `☐ ${item}`, size: 22 })],
            })
          );
        }
        break;
    }
  }

  return paragraphs;
}

export async function exportAnalysisToWord(result: AnalysisResponse): Promise<void> {
  const blocks = parseMarkdownToBlocks(result.analysis);

  const doc = new Document({
    creator: "App Licitações",
    title: "Análise de Licitação",
    description: "Resumo executivo gerado automaticamente",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [
          ...buildMetadataParagraphs(result),
          ...blocksToParagraphs(blocks),
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "Documento gerado pelo App Licitações. Análise baseada exclusivamente nos documentos enviados. Não substitui assessoria jurídica especializada.",
                italics: true,
                size: 18,
                color: "94A3B8",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const { downloadBlob, buildExportFilename } = await import("./markdown-blocks");
  downloadBlob(blob, `${buildExportFilename()}.docx`);
}
