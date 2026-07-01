import type { ProposalMetadata } from "./proposal-types";

export function buildPregaoLine(metadata: ProposalMetadata): string {
  const tipo = (metadata.tipoPregao || "PREGÃO ELETRÔNICO").trim().toUpperCase();
  const numero = (metadata.numeroPregao || "").trim();

  if (numero) {
    const cleanNumero = numero.replace(/^N[º°.]?\s*/i, "").trim();
    return `${tipo} Nº ${cleanNumero}`;
  }

  const ref = metadata.referencia.trim();
  if (ref) {
    const firstSegment = ref.split(" - ")[0]?.trim();
    if (
      firstSegment &&
      /preg|concorr|licit|dispensa|inexig|tomada|convite/i.test(firstSegment)
    ) {
      return firstSegment.toUpperCase();
    }
  }

  return tipo;
}

export function buildReferenciaCompleta(metadata: ProposalMetadata): string {
  const existing = metadata.referencia.trim();
  if (existing) return existing.toUpperCase();

  const parts: string[] = [buildPregaoLine(metadata)];
  const processo = metadata.processo.trim();
  if (processo) {
    const cleanProcesso = processo.replace(/^PROCESSO\s+N[º°.]?\s*/i, "").trim();
    parts.push(`PROCESSO Nº ${cleanProcesso}`);
  }
  return parts.join(" - ");
}
