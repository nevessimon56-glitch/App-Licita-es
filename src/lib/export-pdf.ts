import type { TDocumentDefinitions, Content, TableCell } from "pdfmake/interfaces";
import type { AnalysisResponse } from "./analysis-prompt";
import {
  buildExportFilename,
  downloadBlob,
  extractDocumentMeta,
  parseDocumentMarkdown,
  type DocumentBlock,
} from "./document-parser";

const ROBOTO_FONTS = {
  Roboto: {
    normal: "Roboto-Regular.ttf",
    bold: "Roboto-Medium.ttf",
    italics: "Roboto-Italic.ttf",
    bolditalics: "Roboto-MediumItalic.ttf",
  },
} as const;

const COLORS = {
  primary: "#1a365d",
  secondary: "#2c5282",
  text: "#2d3748",
  muted: "#718096",
  border: "#cbd5e0",
  headerBg: "#edf2f7",
  attentionBg: "#fffbeb",
  attentionBorder: "#f6ad55",
};

async function getPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as typeof pdfMakeModule.default & {
    addVirtualFileSystem?: (vfs: Record<string, string>) => void;
  };
  const vfs = (pdfFontsModule.default ?? pdfFontsModule) as Record<string, string>;

  if (!vfs || typeof vfs !== "object" || !("Roboto-Regular.ttf" in vfs)) {
    throw new Error("Não foi possível carregar as fontes do PDF.");
  }

  if (typeof pdfMake.addVirtualFileSystem === "function") {
    pdfMake.addVirtualFileSystem(vfs);
  }

  return { pdfMake, vfs };
}

function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
}

function keyValueTable(rows: { label: string; value: string }[]): Content {
  return {
    table: {
      widths: [130, "*"],
      body: rows.map((row) => [
        { text: sanitizePdfText(row.label), style: "kvLabel" },
        { text: sanitizePdfText(row.value), style: "kvValue" },
      ]),
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 14],
  };
}

function dataTable(headers: string[], rows: string[][]): Content {
  const headerRow: TableCell[] = headers.map((h) => ({
    text: sanitizePdfText(h),
    style: "tableHeader",
    fillColor: COLORS.headerBg,
  }));

  const bodyRows: TableCell[][] = rows.map((row) =>
    row.map((cell) => ({ text: sanitizePdfText(cell), style: "tableCell" }))
  );

  const colCount = headers.length;
  const widths =
    colCount <= 2
      ? [140, "*"]
      : colCount === 3
        ? [60, "*", "*"]
        : Array(colCount).fill("*");

  return {
    table: {
      headerRows: 1,
      widths,
      body: [headerRow, ...bodyRows],
    },
    layout: {
      hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
        i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.4,
      vLineWidth: () => 0.4,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    margin: [0, 4, 0, 16],
  };
}

function blocksToPdfContent(blocks: DocumentBlock[]): Content[] {
  const content: Content[] = [];
  let skipTitle = true;

  for (const block of blocks) {
    switch (block.type) {
      case "title":
        if (skipTitle) {
          skipTitle = false;
          break;
        }
        content.push({ text: sanitizePdfText(block.text), style: "docTitle", margin: [0, 20, 0, 4] });
        break;

      case "subtitle":
        content.push({ text: sanitizePdfText(block.text), style: "docSubtitle", margin: [0, 0, 0, 16] });
        break;

      case "section":
        content.push({
          text: sanitizePdfText(block.text),
          style: "sectionTitle",
          margin: [0, 18, 0, 10],
        });
        break;

      case "subsection":
        content.push({
          text: sanitizePdfText(block.text),
          style: "subsectionTitle",
          margin: [0, 12, 0, 8],
        });
        break;

      case "keyvalue":
        content.push(keyValueTable(block.rows));
        break;

      case "table":
        if (block.headers.length === 2 && block.rows.length <= 12) {
          const allSimple = block.rows.every((r) => r.length === 2);
          if (allSimple && !block.headers[0].toLowerCase().includes("item")) {
            content.push(
              keyValueTable(
                block.rows.map((r) => ({ label: r[0], value: r[1] }))
              )
            );
            break;
          }
        }
        content.push(dataTable(block.headers, block.rows));
        break;

      case "paragraph":
        content.push({
          text: sanitizePdfText(block.text),
          style: block.variant === "attention" ? "attention" : "body",
          margin: [0, 0, 0, 10],
        });
        break;

      case "list":
        content.push({
          ul: block.items.map((item) => `• ${sanitizePdfText(item)}`),
          style: "body",
          margin: [0, 0, 0, 12],
        });
        break;

      case "checkbox":
        content.push({
          ul: block.items.map((item) => `☐ ${sanitizePdfText(item)}`),
          style: "body",
          margin: [0, 0, 0, 12],
        });
        break;
    }
  }

  return content;
}

export async function exportAnalysisToPdf(result: AnalysisResponse): Promise<void> {
  const { pdfMake, vfs } = await getPdfMake();
  const blocks = parseDocumentMarkdown(result.analysis);
  const meta = extractDocumentMeta(blocks);
  const generatedDate = new Date(result.generatedAt).toLocaleDateString("pt-BR");
  const docs = result.documentSummary.map((d) => d.name).join(", ");

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: meta.title,
      author: "App Licitações",
      subject: "Resumo de edital",
    },
    pageSize: "A4",
    pageMargins: [48, 56, 48, 56],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9.5,
      lineHeight: 1.4,
      color: COLORS.text,
    },
    styles: {
      docTitle: {
        fontSize: 16,
        bold: true,
        color: COLORS.primary,
      },
      docSubtitle: {
        fontSize: 11,
        color: COLORS.secondary,
      },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: COLORS.primary,
      },
      subsectionTitle: {
        fontSize: 10.5,
        bold: true,
        color: COLORS.secondary,
      },
      kvLabel: {
        fontSize: 9.5,
        bold: true,
        color: COLORS.primary,
      },
      kvValue: {
        fontSize: 9.5,
        color: COLORS.text,
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        color: COLORS.primary,
      },
      tableCell: {
        fontSize: 9,
        color: COLORS.text,
      },
      body: {
        fontSize: 9.5,
        color: COLORS.text,
      },
      attention: {
        fontSize: 9,
        color: "#744210",
        italics: true,
        fillColor: COLORS.attentionBg,
      },
      footer: {
        fontSize: 7.5,
        color: COLORS.muted,
      },
    },
    footer: (currentPage, pageCount) => ({
      margin: [48, 0, 48, 0],
      columns: [
        {
          text: `Documento gerado em ${generatedDate} · App Licitações`,
          style: "footer",
          alignment: "left",
        },
        {
          text: `${currentPage} / ${pageCount}`,
          style: "footer",
          alignment: "right",
        },
      ],
    }),
    content: [
      { text: sanitizePdfText(meta.title), style: "docTitle" },
      ...(meta.subtitle
        ? [{ text: sanitizePdfText(meta.subtitle), style: "docSubtitle", margin: [0, 2, 0, 14] as [number, number, number, number] }]
        : [{ text: "", margin: [0, 0, 0, 10] as [number, number, number, number] }]),
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 499,
            y2: 0,
            lineWidth: 1.2,
            lineColor: COLORS.primary,
          },
        ],
        margin: [0, 0, 0, 16],
      },
      ...blocksToPdfContent(blocks),
      {
        text: `Fonte: ${docs}. Este resumo não substitui o edital completo. Revisar documentação oficial antes de participar.`,
        style: "footer",
        margin: [0, 24, 0, 0],
        italics: true,
      },
    ],
  };

  const prefix =
    result.mode === "resumido" ? "resumo-edital-resumido" : "resumo-edital-completo";

  const filename = `${buildExportFilename(prefix)}.pdf`;
  const PDF_EXPORT_TIMEOUT_MS = 120_000;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(
        new Error(
          "A geração do PDF demorou demais. Tente novamente ou exporte em Word."
        )
      );
    }, PDF_EXPORT_TIMEOUT_MS);

    const finish = (action: () => void) => {
      window.clearTimeout(timeout);
      action();
    };

    try {
      const pdf = pdfMake.createPdf(
        docDefinition,
        undefined,
        ROBOTO_FONTS,
        vfs
      );

      pdf.getBlob((blob) => {
        try {
          downloadBlob(blob, filename);
          finish(resolve);
        } catch (error) {
          finish(() => reject(error));
        }
      });
    } catch (error) {
      finish(() => reject(error));
    }
  });
}
