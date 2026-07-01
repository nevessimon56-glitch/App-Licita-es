import { formatCurrencyBRL, getProposalGrandTotal } from "./proposal-layout";
import { buildPregaoLine } from "./proposal-metadata";
import type { ProposalEmailConfig, ProposalItem, ProposalPackage } from "./proposal-types";

export interface ProposalEmailContent {
  subject: string;
  body: string;
}

const PLACEHOLDER = "[Informar]";

const DEFAULT_VIGENCIA =
  "O prazo de vigência da contratação é de 1 ano";

const DEFAULT_HABILITACAO =
  "balanço patrimonial, demonstração de resultado de exercício e demais demonstrações contábeis dos dois últimos exercícios sociais";

export function buildDefaultProposalEmailConfig(
  pkg: ProposalPackage
): ProposalEmailConfig {
  const existing = pkg.email;
  return {
    orgaoResumo: existing?.orgaoResumo?.trim() || inferOrgaoResumo(pkg),
    uasg: existing?.uasg ?? "",
    linkEdital: existing?.linkEdital ?? "",
    localEntrega: existing?.localEntrega?.trim() || inferLocalEntrega(pkg),
    textoVigencia:
      existing?.textoVigencia?.trim() ||
      pkg.condicoesComerciais.vigencia.trim() ||
      DEFAULT_VIGENCIA,
    textoHabilitacao: existing?.textoHabilitacao?.trim() || DEFAULT_HABILITACAO,
    sufixoPregao: existing?.sufixoPregao?.trim() || inferSufixoPregao(pkg),
  };
}

function inferOrgaoResumo(pkg: ProposalPackage): string {
  const orgao = pkg.metadata.orgao.toUpperCase();
  const endereco = pkg.metadata.enderecoOrgao.toUpperCase();
  const ufMatch =
    endereco.match(/\b([A-Z]{2})\b(?![A-Z])/g) ||
    orgao.match(/\b([A-Z]{2})\b(?![A-Z])/g);
  const uf = ufMatch?.[ufMatch.length - 1] ?? "";

  if (/EXERCITO|EXÉRCITO/.test(orgao)) {
    return uf ? `EXERCITO - ${uf}` : "EXERCITO";
  }
  if (/PREFEITURA|MUNICIPIO|MUNICÍPIO/.test(orgao)) {
    const city = orgao
      .replace(/PREFEITURA\s+(MUNICIPAL\s+)?(DE\s+)?/i, "")
      .split(/[,-]/)[0]
      .trim();
    return uf ? `${city} - ${uf}` : city;
  }

  const short = orgao.split(/[,-]/)[0].trim().slice(0, 40);
  return uf ? `${short} - ${uf}` : short;
}

function inferLocalEntrega(pkg: ProposalPackage): string {
  const entrega = pkg.condicoesComerciais.entrega.toUpperCase();
  if (/^LOCAL:/i.test(entrega)) return entrega.replace(/^LOCAL:\s*/i, "").trim();
  if (/VÁRIOS|VARIOS|DIVERSOS/i.test(entrega)) return entrega;
  return "";
}

function inferSufixoPregao(pkg: ProposalPackage): string {
  const text = `${pkg.metadata.objeto} ${pkg.metadata.referencia}`.toUpperCase();
  if (/REGISTRO DE PRE|ATA DE REGISTRO|\bARP\b/.test(text)) {
    return "REGISTRO DE PREÇOS";
  }
  return "";
}

function formatSubjectDate(horarioSessao: string): string {
  const match = horarioSessao.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return `${day.padStart(2, "0")}.${month.padStart(2, "0")}.${year}`;
  }

  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}.${String(now.getMonth() + 1).padStart(2, "0")}.${now.getFullYear()}`;
}

function formatDataSessaoLine(horarioSessao: string): string {
  const value = horarioSessao.trim();
  if (!value) return `DATA: ${PLACEHOLDER}`;
  if (value.toUpperCase().startsWith("DATA:")) return value.toUpperCase();
  return `DATA: ${value.toUpperCase()}`;
}

function buildPregaoEmailLine(pkg: ProposalPackage, config: ProposalEmailConfig): string {
  const tipo = (pkg.metadata.tipoPregao || "PREGÃO ELETRÔNICO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const numero = buildPregaoLine(pkg.metadata);
  const base = numero ? `${tipo} ${numero}` : tipo;
  const suffix = config.sufixoPregao.trim();
  return suffix ? `${base} ${suffix}` : base;
}

function buildObjetoLine(pkg: ProposalPackage): string {
  let objeto = pkg.metadata.objeto.trim().toUpperCase();
  if (!objeto) return `OBJETO: ${PLACEHOLDER}`;
  if (!objeto.startsWith("OBJETO:")) objeto = `OBJETO: ${objeto}`;

  const allSemInstalacao =
    pkg.itens.length > 0 && pkg.itens.every((item) => item.semInstalacao);
  if (allSemInstalacao && !/SEM\s+INSTALA/.test(objeto)) {
    objeto += " SEM INSTALAÇÃO";
  }

  return objeto;
}

function buildItemSpecification(item: ProposalItem): string {
  const parts = [item.tituloProduto, item.descricao]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.join(" ").toUpperCase();
}

function formatPrazoEntrega(entrega: string): string {
  const value = entrega.trim();
  if (!value) return `PRAZO DE ENTREGA: ${PLACEHOLDER}`;
  if (/^PRAZO DE ENTREGA:/i.test(value)) return value.toUpperCase();
  return `PRAZO DE ENTREGA: ${value.toUpperCase()}`;
}

function formatLocal(local: string): string {
  const value = local.trim();
  if (!value) return `LOCAL: ${PLACEHOLDER}`;
  if (/^LOCAL:/i.test(value)) return value.toUpperCase();
  return `LOCAL: ${value.toUpperCase()}`;
}

function formatUasgLine(uasg: string): string {
  const value = uasg.trim();
  if (!value) return `(${PLACEHOLDER})`;
  const digits = value.replace(/^UASG\s*N[º°.]?\s*/i, "").trim();
  return `(${digits})`;
}

function buildItemsTable(pkg: ProposalPackage): string {
  const headers = [
    "ITEM",
    "ESPECIFICAÇÃO",
    "CATMAT",
    "Unidade",
    "Quantidade",
    "VALOR UNITÁRIO",
    "VALOR TOTAL",
  ];

  const lines = [headers.join("\t")];

  for (const item of pkg.itens) {
    lines.push(
      [
        item.numero,
        buildItemSpecification(item),
        item.codigo || "",
        item.unidade || "Unidade",
        String(item.quantidade),
        formatCurrencyBRL(item.valorUnitario),
        formatCurrencyBRL(item.valorTotal),
      ].join("\t")
    );
  }

  return lines.join("\n");
}

export function buildProposalEmailSubject(
  pkg: ProposalPackage,
  config: ProposalEmailConfig
): string {
  const date = formatSubjectDate(pkg.metadata.horarioSessao);
  const orgao = config.orgaoResumo.trim().toUpperCase() || PLACEHOLDER;
  const pregao = buildPregaoLine(pkg.metadata) || PLACEHOLDER;
  return `${date} ${orgao}  PE ${pregao}`;
}

export function buildProposalEmailBody(
  pkg: ProposalPackage,
  config: ProposalEmailConfig
): string {
  const total = formatCurrencyBRL(getProposalGrandTotal(pkg));
  const link = config.linkEdital.trim() || PLACEHOLDER;
  const linkLine = link.startsWith("http")
    ? `Download do edital: ${link}`
    : link;

  const lines = [
    pkg.metadata.orgao.trim().toUpperCase() || PLACEHOLDER,
    buildPregaoEmailLine(pkg, config),
    buildObjetoLine(pkg),
    formatDataSessaoLine(pkg.metadata.horarioSessao),
    "",
    total,
    "",
    "Gov",
    formatUasgLine(config.uasg),
    "",
    linkLine,
    "",
    formatPrazoEntrega(pkg.condicoesComerciais.entrega),
    formatLocal(config.localEntrega),
    "",
    config.textoVigencia.trim() || DEFAULT_VIGENCIA,
    "",
    config.textoHabilitacao.trim() || DEFAULT_HABILITACAO,
    "",
    buildItemsTable(pkg),
  ];

  return lines.join("\n").trimEnd();
}

export function buildProposalEmail(
  pkg: ProposalPackage,
  config?: ProposalEmailConfig
): ProposalEmailContent {
  const emailConfig = config ?? buildDefaultProposalEmailConfig(pkg);
  return {
    subject: buildProposalEmailSubject(pkg, emailConfig),
    body: buildProposalEmailBody(pkg, emailConfig),
  };
}

export function formatProposalEmailForCopy(content: ProposalEmailContent): string {
  return `${content.subject}\n\n${content.body}`;
}
