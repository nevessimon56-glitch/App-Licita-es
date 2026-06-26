import type { TDocumentDefinitions } from "pdfmake/interfaces";

type PdfPrinterConstructor = new (fontDescriptors: Record<string, unknown>) => {
  createPdfKitDocument: (
    docDefinition: TDocumentDefinitions,
    options?: Record<string, unknown>
  ) => NodeJS.ReadableStream & {
    on(event: "data", listener: (chunk: Buffer) => void): void;
    on(event: "end", listener: () => void): void;
    on(event: "error", listener: (error: Error) => void): void;
    end(): void;
  };
};

function getRobotoFonts() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const vfs = require("pdfmake/build/vfs_fonts") as Record<string, string>;

  return {
    Roboto: {
      normal: Buffer.from(vfs["Roboto-Regular.ttf"], "base64"),
      bold: Buffer.from(vfs["Roboto-Medium.ttf"], "base64"),
      italics: Buffer.from(vfs["Roboto-Italic.ttf"], "base64"),
      bolditalics: Buffer.from(vfs["Roboto-MediumItalic.ttf"], "base64"),
    },
  };
}

export async function generatePdfBuffer(
  docDefinition: TDocumentDefinitions
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PdfPrinter = require("pdfmake/src/printer") as PdfPrinterConstructor;
  const printer = new PdfPrinter(getRobotoFonts());
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    pdfDoc.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}
