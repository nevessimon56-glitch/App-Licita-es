import type { CompanyProfile, ProposalMetadata, ProposalPackage } from "./proposal-types";

/** Layout único — sem variação por município ou edital */
export const STANDARD_TABLE_HEADER =
  "UNIDADE DE MEDIDA - CATMAT - ESPECIFICAÇÃO TECNICA DO PRODUTO";

export const STANDARD_CHECKLIST_CATEGORIES = [
  "Documentos de Habilitação",
  "Documentos Complementares",
  "Anexos",
  "Declarações",
  "Proposta",
  "Tipo de Pregão",
  "Enquadramento",
] as const;

export const STANDARD_DECLARACOES_PROPOSTA = `DECLARO(A):

(A) QUE OS PREÇOS OFERTADOS INCLUEM TODOS OS CUSTOS, ENCARGOS TRABALHISTAS, PREVIDENCIÁRIOS, TRIBUTOS, SEGUROS, FRETES E DEMAIS DESPESAS NECESSÁRIAS À PLENA EXECUÇÃO DO OBJETO;

(B) QUE ACEITO INTEGRALMENTE AS CONDIÇÕES ESTABELECIDAS NO EDITAL E EM SEUS ANEXOS, NÃO APRESENTANDO RESSALVAS OU RESSALVAS DE PREÇO;

(C) QUE OS PRODUTOS/EQUIPAMENTOS OFERTADOS ATENDEM A TODOS OS REQUISITOS TÉCNICOS CONSTANTES NO EDITAL, TERMO DE REFERÊNCIA E ANEXOS.`;

export const STANDARD_DIGITAL_SIGNATURE_NOTICE =
  "DOCUMENTO ASSINADO DIGITALMENTE, CONFORME LEI N. 14603/2020, QUE VERSA DA LEGALIDADE DA ASSINATURA DIGITAL, DISPENSANDO RECONHECIMENTO DE FIRMA EM CARTÓRIO.";

export const STANDARD_DECLARATION_SECTIONS = {
  meEpp: "1. DECLARAÇÃO DE ENQUADRAMENTO ME E EPP; ANEXO 2",
  unificada: "2. DECLARAÇÃO UNIFICADA; ANEXO 4",
} as const;

function buildMeEppDeclaration(): string {
  return `DECLARO, PARA FINS DE PARTICIPAÇÃO NO PROCEDIMENTO LICITATÓRIO ACIMA REFERIDO, QUE A EMPRESA ENQUADRA-SE COMO EMPRESA DE PEQUENO PORTE, NOS TERMOS DO ART. 3º, INCISO II, DA LEI COMPLEMENTAR Nº 123/2006, E NÃO SE ENCONTRA NAS VEDAÇÕES DO § 4º DO MESMO DISPOSITIVO LEGAL.`;
}

function buildUnifiedDeclaration(
  company: CompanyProfile,
  metadata: ProposalMetadata
): string {
  return `Para fins de participação no procedimento licitatório ${metadata.referencia || "[REFERÊNCIA DO PREGÃO]"}, referente ao objeto: ${metadata.objeto || "[OBJETO]"}, DECLARO sob as penas da Lei que:

A EMPRESA ${company.razaoSocial.toUpperCase()}, INSCRITA NO CNPJ SOB N° ${company.cnpj}, E I.E SOB Nº ${company.inscricaoEstadual}, SEDIADA À ${company.endereco}, ${company.municipio}-${company.estado}, CEP ${company.cep}.
NESTE ATO REPRESENTADA(O) POR ${company.representanteNome.toUpperCase()}
CARTEIRA DE IDENTIDADE SOB N° ${company.representanteRg}
E CPF SOB N° ${company.representanteCpf}

1) NÃO EMPREGO MENOR DE 18 ANOS EM TRABALHO NOTURNO, PERIGOSO OU INSALUBRE, NEM MENOR DE 16 ANOS EM QUALQUER TRABALHO, SALVO NA CONDIÇÃO DE APRENDIZ, A PARTIR DE 14 ANOS, NOS TERMOS DO ART. 68, INCISO VI, DA LEI Nº 14.133/2021;

2) NÃO FUI DECLARADO INIDÔNEO PARA LICITAR OU CONTRATAR COM A ADMINISTRAÇÃO PÚBLICA, E NÃO ESTOU IMPEDIDO DE LICITAR E CONTRATAR COM O PODER PÚBLICO;

3) TENHO PLENO CONHECIMENTO DAS ESPECIFICAÇÕES E DAS CONDIÇÕES DO EDITAL E SEUS ANEXOS, E ESTOU PLENAMENTE DE ACORDO COM SUAS CONDIÇÕES, ESTANDO APTO A CUMPRIR TODAS AS OBRIGAÇÕES NELE CONTIDAS;

4) PARA FINS DE ASSINATURA DO CONTRATO/ATA DE REGISTRO DE PREÇOS, INDICO COMO REPRESENTANTE LEGAL: ${company.representanteNome.toUpperCase()}, RG ${company.representanteRg}, CPF ${company.representanteCpf}, CARGO ${company.representanteCargo.toUpperCase()};

5) NÃO MANTENHO VÍNCULO DE NATUREZA TÉCNICA, COMERCIAL, ECONÔMICA, FINANCEIRA, TRABALHISTA OU CIVIL COM DIRIGENTE DO ÓRGÃO CONTRATANTE OU COM O PREGOEIRO, NOS TERMOS DO ART. 14, INCISO IV, DA LEI Nº 14.133/2021;

6) INEXISTE, EM RELAÇÃO ÀS AUTORIDADES DO ÓRGÃO CONTRATANTE, SITUAÇÃO ENQUADRADA NO ART. 14, INCISO IV, DA LEI Nº 14.133/2021 E NA SÚMULA VINCULANTE Nº 13 DO STF;

7) TENHO CIÊNCIA DA OBRIGATORIEDADE DE CUMPRIMENTO DA COTA DE PESSOAS COM DEFICIÊNCIA E DE REABILITADOS DA PREVIDÊNCIA SOCIAL, NOS TERMOS DO ART. 93 DA LEI Nº 8.213/1991;

8) A PROPOSTA APRESENTADA INCLUI TODOS OS CUSTOS COM ENCARGOS TRABALHISTAS, PREVIDENCIÁRIOS, TRIBUTÁRIOS E COMERCIAIS;

9) ATENDO ÀS CONDIÇÕES DE HABILITAÇÃO EXIGIDAS NO EDITAL E DECLARO A VERACIDADE DAS INFORMAÇÕES PRESTADAS;

10) PARA FUTURAS COMUNICAÇÕES, INDICO O TELEFONE ${company.telefone} E O E-MAIL ${company.email}.

NOMEAMOS E CONSTITUÍMOS o(a) senhor(a) ${company.representanteNome.toUpperCase()}, portador(a) do CPF/MF sob nº ${company.representanteCpf}, para ser o(a) responsável pela execução da ATA DE REGISTRO DE PREÇOS/CONTRATO, COM PODERES PARA ASSINAR DOCUMENTOS E PRATICAR OS ATOS NECESSÁRIOS.

CASO ALTERE O CITADO E-MAIL OU TELEFONE, COMPROMETO-ME EM PROTOCOLIZAR PEDIDO DE ALTERAÇÃO JUNTO AO ÓRGÃO CONTRATANTE.

POR SER EXPRESSÃO DA VERDADE, FIRMO A PRESENTE.`;
}

export function buildStandardDeclarations(
  company: CompanyProfile,
  metadata: ProposalMetadata
) {
  return [
    {
      titulo: STANDARD_DECLARATION_SECTIONS.meEpp,
      conteudo: buildMeEppDeclaration(),
    },
    {
      titulo: STANDARD_DECLARATION_SECTIONS.unificada,
      conteudo: buildUnifiedDeclaration(company, metadata),
    },
  ];
}

export function normalizeChecklistToStandard(
  checklist: ProposalPackage["checklist"]
): ProposalPackage["checklist"] {
  const mapCategory = (categoria: string): string => {
    const lower = categoria.toLowerCase();
    if (lower.includes("habilit")) return "Documentos de Habilitação";
    if (lower.includes("complement")) return "Documentos Complementares";
    if (lower.includes("anexo")) return "Anexos";
    if (lower.includes("declar")) return "Declarações";
    if (lower.includes("proposta")) return "Proposta";
    if (lower.includes("pregão") || lower.includes("pregao")) return "Tipo de Pregão";
    if (lower.includes("enquadram")) return "Enquadramento";
    return categoria;
  };

  const grouped = new Map<string, ProposalPackage["checklist"]>();

  for (const entry of checklist) {
    const key = mapCategory(entry.categoria);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      categoria: key,
      item: entry.item,
      requisitos: entry.requisitos,
    });
  }

  const normalized: ProposalPackage["checklist"] = [];

  for (const category of STANDARD_CHECKLIST_CATEGORIES) {
    const items = grouped.get(category);
    if (items?.length) {
      normalized.push(...items.map((item) => ({ ...item, categoria: category })));
      continue;
    }

    if (category === "Tipo de Pregão" || category === "Enquadramento") {
      continue;
    }

    normalized.push({
      categoria: category,
      item: "Conforme edital",
      requisitos: "NÃO LOCALIZADO NO DOCUMENTO — COMPLETAR MANUALMENTE",
    });
  }

  return normalized;
}

export function applyStandardProposalPackage(
  pkg: ProposalPackage,
  company: CompanyProfile
): ProposalPackage {
  const tipoPregao =
    pkg.metadata.tipoPregao ||
    (pkg.metadata.referencia.toUpperCase().includes("PREGÃO")
      ? "PREGÃO ELETRÔNICO"
      : "NÃO LOCALIZADO NO DOCUMENTO");

  const enquadramento =
    pkg.metadata.enquadramento || "EMPRESA DE PEQUENO PORTE (ME/EPP)";

  const metadata: ProposalMetadata = {
    ...pkg.metadata,
    tipoPregao,
    enquadramento,
    criterioJulgamento:
      pkg.metadata.criterioJulgamento || "MENOR PREÇO POR ITEM",
  };

  const checklist = normalizeChecklistToStandard(pkg.checklist).filter(
    (entry) =>
      entry.categoria !== "Tipo de Pregão" && entry.categoria !== "Enquadramento"
  );

  checklist.push(
    {
      categoria: "Tipo de Pregão",
      item: tipoPregao,
      requisitos: "Conforme edital analisado",
    },
    {
      categoria: "Enquadramento",
      item: enquadramento,
      requisitos: "Declaração de enquadramento ME/EPP — Anexo 2",
    }
  );

  return {
    ...pkg,
    metadata,
    checklist,
    declaracoesProposta: STANDARD_DECLARACOES_PROPOSTA,
    declaracoesHabilitacao: buildStandardDeclarations(company, metadata),
  };
}
