import { extractDocumentMeta, parseDocumentMarkdown } from "./document-parser";

export interface EmailTemplateData {
  orgao: string;
  tituloPregao: string;
  objeto: string;
  dataSessao: string;
  valorTotal: string;
  portal: string;
  uasg: string;
  linkEdital: string;
  prazoEntrega: string;
  local: string;
}

const PLACEHOLDER = "[Informar]";

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMissing(value: string | undefined): boolean {
  if (!value) return true;
  const lower = value.toLowerCase().trim();
  return (
    !lower ||
    lower.includes("não localizado") ||
    lower.includes("nao localizado") ||
    lower === "-" ||
    lower === "n/a"
  );
}

function pickField(map: Map<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    for (const [mapKey, value] of map.entries()) {
      if (mapKey === normalized || mapKey.includes(normalized)) {
        if (!isMissing(value)) return value.trim();
      }
    }
  }
  return "";
}

function extractFieldMap(markdown: string): Map<string, string> {
  const blocks = parseDocumentMarkdown(markdown);
  const map = new Map<string, string>();

  for (const block of blocks) {
    if (block.type === "keyvalue") {
      for (const row of block.rows) {
        map.set(normalizeKey(row.label), row.value);
      }
    }

    if (block.type === "table" && block.headers.length >= 2) {
      const firstHeader = block.headers[0].toLowerCase();
      if (firstHeader.includes("campo") || firstHeader.includes("item")) {
        for (const row of block.rows) {
          if (row[0]) {
            map.set(normalizeKey(row[0]), row[1]?.trim() ?? "");
          }
        }
      }
    }
  }

  return map;
}

function extractTitleLine(markdown: string): string {
  const match = markdown.match(/^#\s+Resumo do Edital\s*[—–-]\s*(.+)$/m);
  if (!match) return "";
  return match[1].trim();
}

function toUpperPregaoTitle(titlePart: string): string {
  if (!titlePart) return "";
  return titlePart
    .replace(/\bn[º°o]\b/gi, "Nº")
    .replace(/\bno\b/gi, "Nº")
    .toUpperCase();
}

function formatComprasGovRef(value: string): string {
  if (!value) return "";
  const cleaned = value.trim();
  if (/comprasgov/i.test(cleaned)) return cleaned;
  const numberMatch = cleaned.match(/(\d[\d./-]*\d|\d+)/);
  if (numberMatch) {
    return `ComprasGov nº ${numberMatch[1]}`;
  }
  return cleaned;
}

function buildTituloPregao(titlePart: string, comprasNet: string): string {
  const base = toUpperPregaoTitle(titlePart);
  if (!base) return PLACEHOLDER;

  const comprasGov = formatComprasGovRef(comprasNet);
  if (!comprasGov || isMissing(comprasGov)) return base;

  if (base.includes("COMPRASGOV")) return base;
  return `${base} (${comprasGov.toUpperCase()})`;
}

function formatCurrency(value: string): string {
  if (!value) return "";
  const digits = value.replace(/[^\d,.-]/g, "");
  if (!digits) return value.trim();

  const normalized =
    digits.includes(",") && digits.includes(".")
      ? digits.replace(/\./g, "").replace(",", ".")
      : digits.replace(",", ".");

  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return value.trim().toUpperCase();

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDataSessao(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bas\b/gi, "AS")
    .toUpperCase();
}

function formatUasg(value: string): string {
  if (!value) return PLACEHOLDER;
  const cleaned = value.replace(/^uasg\s*n?[º°.]?\s*/i, "").trim();
  return `UASG nº ${cleaned}`;
}

function formatPrazoEntrega(value: string): string {
  if (!value) return PLACEHOLDER;
  const upper = value.toUpperCase();
  if (upper.startsWith("PRAZO DE ENTREGA:")) return upper;
  return `PRAZO DE ENTREGA: ${upper}`;
}

function formatLocal(value: string): string {
  if (!value) return PLACEHOLDER;
  const upper = value.toUpperCase();
  if (upper.startsWith("LOCAL:")) return upper;
  return `LOCAL: ${upper}`;
}

export function extractEmailDataFromAnalysis(analysis: string): EmailTemplateData {
  const map = extractFieldMap(analysis);
  const meta = extractDocumentMeta(parseDocumentMarkdown(analysis));
  const titlePart = extractTitleLine(analysis);

  const orgao = pickField(map, "orgao") || meta.subtitle || PLACEHOLDER;
  const comprasNet = pickField(map, "comprasnet / pncp", "comprasnet", "pncp");
  const tituloPregao = buildTituloPregao(titlePart, comprasNet);

  const objetoRaw = pickField(map, "objeto");
  const objeto = objetoRaw
    ? objetoRaw.toUpperCase().startsWith("OBJETO:")
      ? objetoRaw.toUpperCase()
      : `OBJETO: ${objetoRaw.toUpperCase()}`
    : `OBJETO: ${PLACEHOLDER}`;

  const dataRaw = pickField(
    map,
    "data e hora da sessao",
    "data e hora da sessão",
    "data da sessao",
    "data da sessão"
  );
  const dataSessao = dataRaw
    ? formatDataSessao(dataRaw).startsWith("DATA:")
      ? formatDataSessao(dataRaw)
      : `DATA: ${formatDataSessao(dataRaw)}`
    : `DATA: ${PLACEHOLDER}`;

  const valorRaw = pickField(map, "valor estimado total", "valor total");
  const valorTotal = valorRaw ? formatCurrency(valorRaw) : PLACEHOLDER;

  const uasgRaw = pickField(map, "uasg");
  const uasg = formatUasg(uasgRaw);

  const prazoRaw =
    pickField(map, "prazo de entrega", "entrega") ||
    pickField(map, "prazo de entrega", "entrega", "prazo contratual");
  const prazoEntrega = formatPrazoEntrega(prazoRaw);

  const localRaw = pickField(
    map,
    "local de entrega",
    "local(is) de entrega",
    "local de entrega / instalacao",
    "local"
  );
  const local = formatLocal(localRaw);

  return {
    orgao,
    tituloPregao,
    objeto,
    dataSessao,
    valorTotal,
    portal: "GOV",
    uasg,
    linkEdital: PLACEHOLDER,
    prazoEntrega,
    local,
  };
}

export function formatEmailTemplate(data: EmailTemplateData): string {
  const lines = [
    data.orgao,
    "",
    data.tituloPregao,
    "",
    data.objeto,
    "",
    data.dataSessao,
    "",
    data.valorTotal,
    "",
    data.portal,
    "",
    data.uasg,
    "",
    data.linkEdital.startsWith("Download")
      ? data.linkEdital
      : `Download do edital: ${data.linkEdital}`,
    "",
    data.prazoEntrega,
    data.local,
  ];

  return lines.join("\n").trimEnd();
}

export function buildEmailFromAnalysis(analysis: string): string {
  return formatEmailTemplate(extractEmailDataFromAnalysis(analysis));
}
