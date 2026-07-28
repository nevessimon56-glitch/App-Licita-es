const PREVIEW_MAX = 500;

export function previewText(text: string, max = PREVIEW_MAX): string {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max)}…`;
}

export function buildTextChangeSummary(oldText: string, newText: string) {
  const oldTrim = oldText.replace(/\r\n/g, "\n").trim();
  const newTrim = newText.replace(/\r\n/g, "\n").trim();

  if (oldTrim === newTrim) return null;

  return {
    old_length: oldTrim.length,
    new_length: newTrim.length,
    length_delta: newTrim.length - oldTrim.length,
    old_preview: previewText(oldTrim),
    new_preview: previewText(newTrim),
  };
}

export function countLineChanges(oldText: string, newText: string) {
  const oldLines = new Set(
    oldText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const newLines = newText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let added = 0;
  for (const line of newLines) {
    if (!oldLines.has(line)) added += 1;
  }

  const newLineSet = new Set(newLines);
  let removed = 0;
  for (const line of oldLines) {
    if (!newLineSet.has(line)) removed += 1;
  }

  return { lines_added: added, lines_removed: removed };
}
