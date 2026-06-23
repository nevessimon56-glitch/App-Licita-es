import type { TDocumentDefinitions, Content } from "pdfmake/interfaces";
import type { AnalysisResponse } from "./analysis-prompt";
import { buildExportFilename, parseMarkdownToBlocks } from "./markdown-blocks";

async function getPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = pdfMakeModule.default;
  const vfs = pdfFontsModule.default as { pdfMake?: { vfs: Record<string, string> } };

  pdfMake.vfs = vfs.pdfMake?.vfs ?? (vfs as unknown as Record<string, string>);
  return pdfMake;
}

function blocksToPdfContent(
  blocks: ReturnType<typeof parseMarkdownToBlocks>
): Content[] {
  const content: Content[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        content.push({
          text: block.text,
          style: "sectionTitle",
          margin: [0, 18, 0, 8],
        });
        break;
      case "h3":
        content.push({
          text: block.text,
          style: "subTitle",
          margin: [0, 12, 0, 6],
        });
        break;
      case "paragraph":
        content.push({
          text: block.text,
          style: "body",
          margin: [0, 0, 0, 6],
        });
        break;
      case "list":
        content.push({
          ul: block.items,
          style: "body",
          margin: [0, 0, 0, 8],
        });
        break;
      case "checkbox":
        content.push({
          ul: block.items.map((item) => `☐ ${item}`),
          style: "body",
          margin: [0, 0, 0, 8],
        });
        break;
    }
  }

  return content;
}

export async function exportAnalysisToPdf(result: AnalysisResponse): Promise<void> {
  const pdfMake = await getPdfMake();
  const blocks = parseMarkdownToBlocks(result.analysis);
  const generatedDate = new Date(result.generatedAt).toLocaleString("pt-BR");
  const docs = result.documentSummary
    .map((d) => `${d.name} (${d.pageCount} pág.)`)
    .join(" · ");

  const docDefinition: TDocumentDefinitions = {
    info: {
      title: "Análise de Licitação",
      author: "App Licitações",
      subject: "Resumo executivo de licitação pública",
    },
    pageSize: "A4",
    pageMargins: [50, 60, 50, 60],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      lineHeight: 1.35,
      color: "#334155",
    },
    styles: {
      coverTitle: {
        fontSize: 22,
        bold: true,
        color: "#1E40AF",
        alignment: "center",
      },
      coverSubtitle: {
        fontSize: 13,
        color: "#475569",
        alignment: "center",
        margin: [0, 8, 0, 0] as [number, number, number, number],
      },
      meta: {
        fontSize: 9,
        color: "#64748B",
        margin: [0, 4, 0, 0] as [number, number, number, number],
      },
      sectionTitle: {
        fontSize: 14,
        bold: true,
        color: "#1E3A8A",
      },
      subTitle: {
        fontSize: 12,
        bold: true,
        color: "#1E293B",
      },
      body: {
        fontSize: 10,
        color: "#334155",
      },
      footer: {
        fontSize: 8,
        color: "#94A3B8",
        italics: true,
      },
    },
    footer: (currentPage, pageCount) => ({
      columns: [
        {
          text: "App Licitações — Análise baseada nos documentos enviados",
          style: "footer",
          alignment: "left",
          margin: [50, 0, 0, 0],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          style: "footer",
          alignment: "right",
          margin: [0, 0, 50, 0],
        },
      ],
    }),
    content: [
      { text: "APP LICITAÇÕES", style: "coverTitle" },
      {
        text: "Resumo Executivo de Licitação Pública",
        style: "coverSubtitle",
      },
      { text: `Gerado em: ${generatedDate}`, style: "meta", alignment: "center" },
      { text: `Modelo: ${result.model}`, style: "meta", alignment: "center" },
      { text: `Documentos: ${docs}`, style: "meta", alignment: "center", margin: [0, 4, 0, 24] },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: 495,
            y2: 0,
            lineWidth: 1,
            lineColor: "#DBEAFE",
          },
        ],
        margin: [0, 0, 0, 20],
      },
      ...blocksToPdfContent(blocks),
      {
        text: "Documento gerado pelo App Licitações. Não substitui assessoria jurídica especializada.",
        style: "footer",
        margin: [0, 30, 0, 0],
      },
    ],
  };

  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      pdf.download(`${buildExportFilename()}.pdf`, () => resolve());
    } catch (error) {
      reject(error);
    }
  });
}
