import type { CompanyProfile } from "./proposal-types";

const CONTACT = {
  telefone: "(019) 3883-4945",
  fax: "3883-1127",
} as const;

const TORQUATO_REP = {
  representanteNome: "DIVA LUISA TORQUATO",
  representanteRg: "17.247.126-6 SSP/SP",
  representanteCpf: "048.250.798-57",
  representanteCargo: "PROPRIETÁRIA",
  representanteNascimento: "29/01/1943",
  representanteEndereco:
    "RUA JOSE BONIFACIO, Nº 1.201, BAIRRO: CENTRO, PALMAS-TO, CEP: 77.006-000",
} as const;

const PRADO_REP = {
  representanteNome: "ROSELI DANTAS DA SILVA CARDOSO DO PRADO",
  representanteRg: "20.670.955-9",
  representanteCpf: "171.516.598-57",
  representanteCargo: "REPRESENTANTE LEGAL",
  representanteNascimento: "",
  representanteEndereco:
    "RUA CATARINA MORANZA BELINTANI, Nº 171, BAIRRO: JD. ALVORADA, SUMARÉ-SP, CEP: 13.170-740",
} as const;

export const COMPANY_PROFILES: CompanyProfile[] = [
  {
    id: "torquato-filial-palmas",
    nomeFantasia: "Comercial Torquato — Filial Palmas/TO",
    razaoSocial: "D L TORQUATO LTDA (COMERCIAL TORQUATO)",
    cnpj: "01.461.135/0002-06 - FILIAL",
    inscricaoEstadual: "29.524.173-0",
    email: "dlt.licitacao@gmail.com",
    endereco:
      "ROD. TO 010, KM 01, Nº SN - LOTE 12B GALPAO04 SALA 10AB, BAIRRO: ZONA RURAL, MUNICÍPIO: PALMAS, ESTADO: TOCANTINS - CEP: 77.249-899",
    municipio: "PALMAS",
    estado: "TOCANTINS",
    cep: "77.249-899",
    banco: "BANCO DO BRASIL",
    agencia: "8193-0",
    conta: "0000885-0",
    assinaturaCidade: "PALMAS-TO",
    ...CONTACT,
    ...TORQUATO_REP,
  },
  {
    id: "torquato-matriz-sumare",
    nomeFantasia: "Comercial Torquato — Matriz Sumaré/SP",
    razaoSocial: "D L TORQUATO LTDA (COMERCIAL TORQUATO)",
    cnpj: "01.461.135/0001-17 - MATRIZ",
    inscricaoEstadual: "671.526.989.115",
    email: "dlt.licitacao@gmail.com",
    endereco:
      "RUA CATARINA MORANZA BELINTANI, Nº 220, BAIRRO: JD. ALVORADA, CIDADE: SUMARÉ, ESTADO: SÃO PAULO - CEP: 13.170-740",
    municipio: "SUMARÉ",
    estado: "SP",
    cep: "13.170-740",
    banco: "BANCO DO BRASIL",
    agencia: "8193-0",
    conta: "0000885-0",
    assinaturaCidade: "SUMARÉ-SP",
    ...CONTACT,
    ...TORQUATO_REP,
  },
  {
    id: "prado-filial-palmas",
    nomeFantasia: "Prado Comercial — Filial Palmas/TO",
    razaoSocial:
      "PRADO COMERCIO DE ELETRONICOS E SERVI. DE INSTALACOES LTDA (PRADO COMERCIAL)",
    cnpj: "04.602.194/0002-37 - FILIAL",
    inscricaoEstadual: "29.424.472-7",
    email: "licitacao@pradocomercial.com.br",
    endereco:
      "ROD. TO 010, KM 01, Nº S/Nº - LOTE 12B GALPAO04 SALA 10AB, BAIRRO: ZONA RURAL, CIDADE: PALMAS, ESTADO: TOCANTINS - CEP: 77.249-899",
    municipio: "PALMAS",
    estado: "TOCANTINS",
    cep: "77.249-899",
    banco: "BANCO DO BRASIL",
    agencia: "6977-9",
    conta: "1110-X",
    assinaturaCidade: "PALMAS-TO",
    ...CONTACT,
    ...PRADO_REP,
  },
  {
    id: "prado-matriz-sumare",
    nomeFantasia: "Prado Comercial — Matriz Sumaré/SP",
    razaoSocial:
      "PRADO COMERCIO DE ELETRONICOS E SERVICOS DE INSTALACOES LTDA (PRADO COMERCIAL)",
    cnpj: "04.602.194/0001-56 - MATRIZ",
    inscricaoEstadual: "671.219.330.114",
    email: "licitacao@pradocomercial.com.br",
    endereco:
      "RUA CATARINA MORANZA BELINTANI, Nº 171, BAIRRO: JD. ALVORADA, CIDADE: SUMARÉ, ESTADO: SÃO PAULO - CEP: 13.170-740",
    municipio: "SUMARÉ",
    estado: "SP",
    cep: "13.170-740",
    banco: "BANCO DO BRASIL",
    agencia: "6977-9",
    conta: "1110-X",
    assinaturaCidade: "SUMARÉ-SP",
    ...CONTACT,
    ...PRADO_REP,
  },
];

export const DEFAULT_COMPANY_ID = "torquato-filial-palmas";

export function getCompanyById(id: string): CompanyProfile {
  return (
    COMPANY_PROFILES.find((company) => company.id === id) ?? COMPANY_PROFILES[0]
  );
}

export const DEFAULT_COMPANY_PROFILE = getCompanyById(DEFAULT_COMPANY_ID);

export function formatCompanyCnpjLine(company: CompanyProfile): string {
  const ie = company.inscricaoEstadual
    ? ` - INSCRIÇÃO EST.: ${company.inscricaoEstadual}`
    : "";
  return `CNPJ SOB Nº ${company.cnpj}${ie}`;
}

export function formatCompanyContactLine(company: CompanyProfile): string {
  return `TELEFONE: ${company.telefone} - FAX: ${company.fax} - E-MAIL: ${company.email}`;
}

export function formatCompanyAddressLine(company: CompanyProfile): string {
  return `ENDEREÇO: ${company.endereco}`;
}
