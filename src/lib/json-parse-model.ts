/**
 * Extrai e repara JSON retornado por modelos de linguagem.
 */

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function removeTrailingCommas(json: string): string {
  return json.replace(/,\s*([}\]])/g, "$1");
}

function normalizeSmartQuotes(json: string): string {
  return json
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/^\uFEFF/, "");
}

function closeTruncatedJson(json: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  let result = json;

  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if ((ch === "}" || ch === "]") && stack[stack.length - 1] === ch) {
      stack.pop();
    }
  }

  if (inString) {
    result += '"';
  }

  result = result
    .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*"[^"\\]*(?:\\.[^"\\]*)*$/m, "")
    .replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*$/m, "")
    .replace(/,\s*$/m, "");

  while (stack.length) {
    result += stack.pop();
  }

  return result;
}

function escapeRawNewlinesInStrings(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
        out += ch;
        continue;
      }
      if (ch === "\n") {
        out += "\\n";
        continue;
      }
      if (ch === "\r") {
        continue;
      }
      if (ch === "\t") {
        out += "\\t";
        continue;
      }
      out += ch;
      continue;
    }

    if (ch === '"') {
      inString = true;
    }
    out += ch;
  }

  return out;
}

function tryParse(json: string): unknown {
  return JSON.parse(json);
}

export function parseModelJson(text: string): unknown {
  const candidate = extractJsonCandidate(text);
  const attempts = [
    candidate,
    removeTrailingCommas(candidate),
    removeTrailingCommas(normalizeSmartQuotes(candidate)),
    removeTrailingCommas(escapeRawNewlinesInStrings(normalizeSmartQuotes(candidate))),
    removeTrailingCommas(
      escapeRawNewlinesInStrings(normalizeSmartQuotes(closeTruncatedJson(candidate)))
    ),
  ];

  let lastError: unknown;

  for (const attempt of attempts) {
    try {
      return tryParse(attempt);
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "JSON inválido retornado pela IA.";
  throw new Error(
    `Não foi possível interpretar a resposta da IA (${message}). Tente gerar a proposta novamente.`
  );
}

export function extractJsonFromModelResponse(text: string): unknown {
  return parseModelJson(text);
}
