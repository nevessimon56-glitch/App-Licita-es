import { sanitizeDownloadFilename } from "./proposal-export-filename";

export type DocumentBlock =
  | { type: "title"; text: string }
  | { type: "subtitle"; text: string }
  | { type: "section"; text: string }
  | { type: "subsection"; text: string }
  | { type: "paragraph"; text: string; variant: "normal" | "attention" }
  | { type: "list"; items: string[] }
  | { type: "checkbox"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "keyvalue"; rows: { label: string; value: string }[] };

export function parseDocumentMarkdown(markdown: string): DocumentBlock[] {
  const lines = markdown.split("\n");
  const blocks: DocumentBlock[] = [];
  let listBuffer: string[] | null = null;
  let checkboxBuffer: string[] | null = null;
  let tableBuffer: string[][] | null = null;
  let keyValueBuffer: { label: string; value: string }[] | null = null;

  const flushList = () => {
    if (listBuffer?.length) {
      blocks.push({ type: "list", items: listBuffer });
      listBuffer = null;
    }
  };

  const flushCheckbox = () => {
    if (checkboxBuffer?.length) {
      blocks.push({ type: "checkbox", items: checkboxBuffer });
      checkboxBuffer = null;
    }
  };

  const flushTable = () => {
    if (tableBuffer?.length) {
      const [header, ...rows] = tableBuffer;
      blocks.push({
        type: "table",
        headers: header.map(stripMarkdown),
        rows: rows.map((row) => row.map(stripMarkdown)),
      });
      tableBuffer = null;
    }
  };

  const flushKeyValue = () => {
    if (keyValueBuffer?.length) {
      blocks.push({ type: "keyvalue", rows: keyValueBuffer });
      keyValueBuffer = null;
    }
  };

  const flushAll = () => {
    flushList();
    flushCheckbox();
    flushTable();
    flushKeyValue();
  };

  const pushKeyValue = (label: string, value: string) => {
    flushList();
    flushCheckbox();
    flushTable();
    if (!keyValueBuffer) keyValueBuffer = [];
    keyValueBuffer.push({ label: stripMarkdown(label), value: stripMarkdown(value) });
  };

  let seenTitle = false;
  let seenSubtitle = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("|") && line.includes("|")) {
      flushList();
      flushCheckbox();
      flushKeyValue();

      if (/^\|[-\s|:]+\|$/.test(line.replace(/\s/g, ""))) continue;

      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      if (!tableBuffer) tableBuffer = [];
      tableBuffer.push(cells);
      continue;
    }

    if (tableBuffer) flushTable();

    if (line.startsWith("# ")) {
      flushAll();
      blocks.push({ type: "title", text: stripMarkdown(line.slice(2)) });
      seenTitle = true;
      continue;
    }

    if (line.startsWith("## ")) {
      flushAll();
      const text = cleanSectionTitle(stripMarkdown(line.slice(3)));
      // Primeiro ## após o título = órgão (subtítulo), não seção
      if (seenTitle && !seenSubtitle) {
        blocks.push({ type: "subtitle", text });
        seenSubtitle = true;
      } else {
        blocks.push({ type: "section", text });
      }
      continue;
    }

    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "subsection", text: stripMarkdown(line.slice(4)) });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      flushCheckbox();
      flushKeyValue();
      if (!listBuffer) listBuffer = [];
      listBuffer.push(stripMarkdown(line.replace(/^[-*]\s/, "")));
      continue;
    }

    if (/^☐\s/.test(line) || /^-?\s*☐\s/.test(line)) {
      flushList();
      flushKeyValue();
      if (!checkboxBuffer) checkboxBuffer = [];
      checkboxBuffer.push(stripMarkdown(line.replace(/^-?\s*☐\s*/, "")));
      continue;
    }

    const kvColon = line.match(/^([^:|]+):\s+(.+)$/);
    if (kvColon && !line.startsWith("http")) {
      pushKeyValue(kvColon[1], kvColon[2]);
      continue;
    }

    const kvPipe = line.match(/^([^|]+)\|\s*(.+)$/);
    if (kvPipe && line.split("|").length === 2) {
      pushKeyValue(kvPipe[1], kvPipe[2]);
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushAll();
    const text = stripMarkdown(line);
    const isAttention =
      /^aten[cç][aã]o/i.test(text) ||
      text.toLowerCase().startsWith("importante:") ||
      text.toLowerCase().startsWith("observação:") ||
      text.toLowerCase().startsWith("observacao:");

    blocks.push({
      type: "paragraph",
      text,
      variant: isAttention ? "attention" : "normal",
    });
  }

  flushAll();
  return blocks;
}

export function extractDocumentMeta(blocks: DocumentBlock[]) {
  const title = blocks.find((b) => b.type === "title")?.text;
  const subtitle = blocks.find((b) => b.type === "subtitle")?.text;

  return {
    title: title ?? "Resumo do Edital",
    subtitle: subtitle ?? "",
  };
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function cleanSectionTitle(text: string): string {
  return text.replace(/^\d+\.\s*/, "").trim();
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

export function buildExportFilename(prefix = "resumo-edital"): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const safeName = sanitizeDownloadFilename(filename) || "download";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeName;
  anchor.click();
  URL.revokeObjectURL(url);
}
