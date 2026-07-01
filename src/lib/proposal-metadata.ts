import type { ProposalMetadata } from "./proposal-types";

/** Número exibido após o rótulo PREGÃO: no cabeçalho da proposta. */
export function buildPregaoLine(metadata: ProposalMetadata): string {
  const numero = (metadata.numeroPregao || "").trim();
  if (numero) {
    return numero.replace(/^N[º°.]?\s*/i, "").trim().toUpperCase();
  }

  const ref = metadata.referencia.trim();
  if (ref) {
    const firstSegment = ref.split(" - ")[0]?.trim();
    const match = firstSegment?.match(/N[º°.]?\s*(.+)$/i);
    if (match?.[1]) {
      return match[1].trim().toUpperCase();
    }
  }

  return "";
}

/** Texto completo para declarações e checklist (modalidade + número). */
export function buildPregaoReferencia(metadata: ProposalMetadata): string {
  const tipo = (metadata.tipoPregao || "PREGÃO ELETRÔNICO").trim().toUpperCase();
  const numero = buildPregaoLine(metadata);
  if (numero) return `${tipo} Nº ${numero}`;
  return tipo;
}

export function buildReferenciaCompleta(metadata: ProposalMetadata): string {
  const existing = metadata.referencia.trim();
  if (existing) return existing.toUpperCase();

  const parts: string[] = [buildPregaoReferencia(metadata)];
  const processo = metadata.processo.trim();
  if (processo) {
    const cleanProcesso = processo.replace(/^PROCESSO\s+N[º°.]?\s*/i, "").trim();
    parts.push(`PROCESSO Nº ${cleanProcesso}`);
  }
  return parts.join(" - ");
}
