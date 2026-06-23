export type MarkdownBlock =
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "checkbox"; items: string[] };

export function parseMarkdownToBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  let listBuffer: string[] | null = null;
  let checkboxBuffer: string[] | null = null;

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

  const flushAll = () => {
    flushList();
    flushCheckbox();
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith("## ")) {
      flushAll();
      blocks.push({ type: "h2", text: stripMarkdown(line.slice(3)) });
      continue;
    }

    if (line.startsWith("### ")) {
      flushAll();
      blocks.push({ type: "h3", text: stripMarkdown(line.slice(4)) });
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      flushCheckbox();
      if (!listBuffer) listBuffer = [];
      listBuffer.push(stripMarkdown(line.replace(/^[-*]\s/, "")));
      continue;
    }

    if (/^☐\s/.test(line) || /^-?\s*☐\s/.test(line)) {
      flushList();
      if (!checkboxBuffer) checkboxBuffer = [];
      checkboxBuffer.push(stripMarkdown(line.replace(/^-?\s*☐\s*/, "")));
      continue;
    }

    if (!line.trim()) {
      flushAll();
      continue;
    }

    flushAll();
    blocks.push({ type: "paragraph", text: stripMarkdown(line) });
  }

  flushAll();
  return blocks;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

export function buildExportFilename(prefix = "analise-licitacao"): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
