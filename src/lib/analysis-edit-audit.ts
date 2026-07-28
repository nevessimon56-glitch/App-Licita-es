import { splitMarkdownSections } from "@/lib/markdown-sections";
import {
  buildTextChangeSummary,
  countLineChanges,
  previewText,
} from "@/lib/text-change-summary";

export function buildAnalysisEditAudit(original: string, edited: string) {
  const summary = buildTextChangeSummary(original, edited);
  if (!summary) return null;

  const lineChanges = countLineChanges(original, edited);
  const origSections = splitMarkdownSections(original).sections;
  const editMap = new Map(
    splitMarkdownSections(edited).sections.map((section) => [
      section.title,
      section.body,
    ])
  );

  const sectionsChanged: Array<{
    secao: string;
    old_preview: string;
    new_preview: string;
    length_delta: number;
  }> = [];

  for (const section of origSections) {
    const newBody = editMap.get(section.title);
    if (newBody === undefined) {
      sectionsChanged.push({
        secao: section.title,
        old_preview: previewText(section.body, 200),
        new_preview: "— (seção removida)",
        length_delta: -section.body.length,
      });
      continue;
    }

    const change = buildTextChangeSummary(section.body, newBody);
    if (change) {
      sectionsChanged.push({
        secao: section.title,
        old_preview: change.old_preview,
        new_preview: change.new_preview,
        length_delta: change.length_delta,
      });
    }
  }

  for (const [title, body] of editMap) {
    if (!origSections.some((section) => section.title === title)) {
      sectionsChanged.push({
        secao: title,
        old_preview: "— (seção nova)",
        new_preview: previewText(body, 200),
        length_delta: body.length,
      });
    }
  }

  return {
    ...summary,
    ...lineChanges,
    secoes_alteradas: sectionsChanged,
    secoes_alteradas_count: sectionsChanged.length,
  };
}
