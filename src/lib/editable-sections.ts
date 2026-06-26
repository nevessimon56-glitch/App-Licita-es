export const EDITABLE_SECTION_NAMES = [
  "Informações Gerais",
  "Entrega",
  "Instalação",
  "Instalação e Serviços",
  "Pagamento e Garantia",
  "Qualificação Técnica",
  "Prazos",
  "Valores",
  "Valores e SRP",
] as const;

export function normalizeSectionTitle(title: string): string {
  return title
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isEditableSection(title: string): boolean {
  const normalized = normalizeSectionTitle(title);
  return EDITABLE_SECTION_NAMES.some(
    (name) => normalizeSectionTitle(name) === normalized
  );
}
