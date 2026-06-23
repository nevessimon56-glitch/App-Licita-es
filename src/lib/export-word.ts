import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import type { AnalysisResponse } from "./analysis-prompt";
import {
  buildExportFilename,
  downloadBlob,
  extractDocumentMeta,
  parseDocumentMarkdown,
  type DocumentBlock,
} from "./document-parser";

const COLORS = {
  primary: "1A365D",
  secondary: "2C5282",
  text: "2D3748",
  muted: "718096",
  headerBg: "EDF2F7",
  attentionBg: "FFFBEB",
  border: "CBD5E0",
};

function headerParagraphs(title: string, subtitle: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { after: 80 },
      children: [
        new TextRun({ text: title, bold: true, size: 32, color: COLORS.primary }),
      ],
    }),
    ...(subtitle
      ? [
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({ text: subtitle, size: 22, color: COLORS.secondary }),
            ],
          }),
        ]
      : []),
    new Paragraph({
      spacing: { after: 240 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORS.primary },
      },
      children: [new TextRun({ text: "" })],
    }),
  ];
}

function keyValueTable(rows: { label: string; value: string }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              borders: {
                bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: row.label,
                      bold: true,
                      size: 19,
                      color: COLORS.primary,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 72, type: WidthType.PERCENTAGE },
              borders: {
                bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.border },
              },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: row.value, size: 19, color: COLORS.text }),
                  ],
                }),
              ],
            }),
          ],
        })
    ),
  });
}

function dataTable(headers: string[], rows: string[][]): Table {
  const colWidth = Math.floor(100 / headers.length);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map(
          (header) =>
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: header,
                      bold: true,
                      size: 18,
                      color: COLORS.primary,
                    }),
                  ],
                }),
              ],
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  width: { size: colWidth, type: WidthType.PERCENTAGE },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({ text: cell, size: 18, color: COLORS.text }),
                      ],
                    }),
                  ],
                })
            ),
          })
      ),
    ],
  });
}

function blocksToDocx(blocks: DocumentBlock[], skipTitle: boolean): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  let titleSkipped = skipTitle;

  for (const block of blocks) {
    switch (block.type) {
      case "title":
        if (titleSkipped) {
          titleSkipped = false;
          break;
        }
        elements.push(
          new Paragraph({
            spacing: { before: 300, after: 80 },
            children: [
              new TextRun({ text: block.text, bold: true, size: 30, color: COLORS.primary }),
            ],
          })
        );
        break;

      case "subtitle":
        elements.push(
          new Paragraph({
            spacing: { after: 160 },
            children: [
              new TextRun({ text: block.text, size: 22, color: COLORS.secondary }),
            ],
          })
        );
        break;

      case "section":
        elements.push(
          new Paragraph({
            spacing: { before: 280, after: 120 },
            children: [
              new TextRun({ text: block.text, bold: true, size: 24, color: COLORS.primary }),
            ],
          })
        );
        break;

      case "subsection":
        elements.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: block.text, bold: true, size: 21, color: COLORS.secondary }),
            ],
          })
        );
        break;

      case "keyvalue":
        elements.push(keyValueTable(block.rows));
        elements.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
        break;

      case "table":
        if (block.headers.length === 2 && block.rows.length <= 12) {
          const allSimple = block.rows.every((r) => r.length === 2);
          if (allSimple && !block.headers[0].toLowerCase().includes("item")) {
            elements.push(
              keyValueTable(block.rows.map((r) => ({ label: r[0], value: r[1] })))
            );
            elements.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
            break;
          }
        }
        elements.push(dataTable(block.headers, block.rows));
        elements.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
        break;

      case "paragraph":
        elements.push(
          new Paragraph({
            spacing: { after: 120 },
            shading:
              block.variant === "attention"
                ? { type: ShadingType.CLEAR, fill: COLORS.attentionBg }
                : undefined,
            children: [
              new TextRun({
                text: block.text,
                size: 19,
                color: block.variant === "attention" ? "744210" : COLORS.text,
                italics: block.variant === "attention",
              }),
            ],
          })
        );
        break;

      case "list":
        for (const item of block.items) {
          elements.push(
            new Paragraph({
              spacing: { after: 60 },
              bullet: { level: 0 },
              children: [new TextRun({ text: item, size: 19, color: COLORS.text })],
            })
          );
        }
        break;

      case "checkbox":
        for (const item of block.items) {
          elements.push(
            new Paragraph({
              spacing: { after: 60 },
              children: [
                new TextRun({ text: `☐ ${item}`, size: 19, color: COLORS.text }),
              ],
            })
          );
        }
        break;
    }
  }

  return elements;
}

export async function exportAnalysisToWord(result: AnalysisResponse): Promise<void> {
  const blocks = parseDocumentMarkdown(result.analysis);
  const meta = extractDocumentMeta(blocks);
  const generatedDate = new Date(result.generatedAt).toLocaleDateString("pt-BR");
  const docs = result.documentSummary.map((d) => d.name).join(", ");

  const doc = new Document({
    creator: "App Licitações",
    title: meta.title,
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 },
          },
        },
        children: [
          ...headerParagraphs(meta.title, meta.subtitle),
          ...blocksToDocx(blocks, true),
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `Documento gerado em ${generatedDate}. Fonte: ${docs}. Este resumo não substitui o edital completo.`,
                italics: true,
                size: 16,
                color: COLORS.muted,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `${buildExportFilename()}.docx`);
}
