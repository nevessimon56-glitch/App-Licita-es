const UNIDADES = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

function joinParts(parts: string[]): string {
  const filtered = parts.filter(Boolean);
  if (!filtered.length) return "";
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} e ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(", ")} e ${filtered[filtered.length - 1]}`;
}

function readBelow1000(value: number): string {
  if (value === 0) return "";
  if (value === 100) return "cem";

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];

  if (hundreds) {
    parts.push(CENTENAS[hundreds]);
  }

  if (remainder > 0 && remainder < 20) {
    parts.push(UNIDADES[remainder]);
  } else if (remainder >= 20) {
    const tens = Math.floor(remainder / 10);
    const units = remainder % 10;
    if (units) {
      parts.push(`${DEZENAS[tens]} e ${UNIDADES[units]}`);
    } else {
      parts.push(DEZENAS[tens]);
    }
  }

  return joinParts(parts);
}

function readGroup(value: number, singular: string, plural: string): string {
  if (value === 0) return "";
  if (value === 1) return singular;
  return `${readBelow1000(value)} ${plural}`;
}

function integerToWords(value: number): string {
  if (value === 0) return "zero";

  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  const remainder = value % 1_000;

  const parts = [
    readGroup(billions, "um bilhão", "bilhões"),
    readGroup(millions, "um milhão", "milhões"),
    thousands === 1 ? "mil" : readGroup(thousands, "", "mil"),
    readBelow1000(remainder),
  ].filter(Boolean);

  return joinParts(parts);
}

/** Ex.: 46350.00 → "QUARENTA E SEIS MIL, TREZENTOS E CINQUENTA REAIS" */
export function formatCurrencyExtenso(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 0) {
    return "";
  }

  const cents = Math.round((value - Math.trunc(value)) * 100);
  const reais = Math.trunc(value);

  let text = integerToWords(reais);
  text += reais === 1 ? " real" : " reais";

  if (cents > 0) {
    text += ` e ${integerToWords(cents)} ${cents === 1 ? "centavo" : "centavos"}`;
  }

  return text.toUpperCase();
}
