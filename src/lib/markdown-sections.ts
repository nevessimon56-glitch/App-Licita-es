import { normalizeSectionTitle } from "./editable-sections";

export interface MarkdownSection {
  title: string;
  body: string;
}

export interface KvTableRow {
  label: string;
  value: string;
}

export function splitMarkdownSections(markdown: string): {
  preamble: string;
  sections: MarkdownSection[];
} {
  const lines = markdown.split("\n");
  const preambleLines: string[] = [];
  const sections: MarkdownSection[] = [];
  let currentSection: { title: string; bodyLines: string[] } | null = null;
  let subtitleSeen = false;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      const title = line.slice(3).replace(/^\d+\.\s*/, "").trim();

      if (!subtitleSeen) {
        subtitleSeen = true;
        preambleLines.push(line);
        continue;
      }

      if (currentSection) {
        sections.push({
          title: currentSection.title,
          body: currentSection.bodyLines.join("\n").trimEnd(),
        });
      }

      currentSection = { title, bodyLines: [] };
      continue;
    }

    if (currentSection) {
      currentSection.bodyLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }

  if (currentSection) {
    sections.push({
      title: currentSection.title,
      body: currentSection.bodyLines.join("\n").trimEnd(),
    });
  }

  return {
    preamble: preambleLines.join("\n").trimEnd(),
    sections,
  };
}

export function rebuildMarkdown(
  preamble: string,
  sections: MarkdownSection[]
): string {
  const parts: string[] = [];

  if (preamble) parts.push(preamble);

  for (const section of sections) {
    parts.push(`## ${section.title}`);
    if (section.body) parts.push(section.body);
  }

  return `${parts.join("\n\n").trimEnd()}\n`;
}

export function updateSectionBody(
  markdown: string,
  sectionTitle: string,
  newBody: string
): string {
  const { preamble, sections } = splitMarkdownSections(markdown);
  const target = normalizeSectionTitle(sectionTitle);

  const updatedSections = sections.map((section) =>
    normalizeSectionTitle(section.title) === target
      ? { ...section, body: newBody }
      : section
  );

  return rebuildMarkdown(preamble, updatedSections);
}

export function isSimpleKvTable(body: string): boolean {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return false;

  const tableLines = lines.filter((line) => line.startsWith("|"));
  if (tableLines.length !== lines.length) return false;

  const headerCells = tableLines[0]
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  return headerCells.length === 2;
}

export function parseKvTable(body: string): {
  headers: [string, string];
  rows: KvTableRow[];
} {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));

  if (lines.length < 2) {
    return { headers: ["Campo", "Informação"], rows: [] };
  }

  const headerCells = lines[0]
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean);

  const headers: [string, string] = [
    headerCells[0] ?? "Campo",
    headerCells[1] ?? "Informação",
  ];

  const rows = lines.slice(2).map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

    return {
      label: unescapeCell(cells[0] ?? ""),
      value: unescapeCell(cells[1] ?? ""),
    };
  });

  return { headers, rows };
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function unescapeCell(text: string): string {
  return text.replace(/\\\|/g, "|");
}

export function buildKvTableMarkdown(
  headers: [string, string],
  rows: KvTableRow[]
): string {
  const lines = [
    `| ${headers[0]} | ${headers[1]} |`,
    "|-------|------------|",
    ...rows.map(
      (row) => `| ${escapeCell(row.label)} | ${escapeCell(row.value)} |`
    ),
  ];

  return lines.join("\n");
}
