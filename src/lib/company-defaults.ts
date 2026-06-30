import type { CompanyProfile } from "./proposal-types";

/** Dados compartilhados do grupo (representante, banco) */
const SHARED = {
  telefone: "(019) 3883-4945",
  fax: "3883-1127",
  banco: "BANCO DO BRASIL",
  agencia: "8193-0",
  conta: "0000885-0",
  representanteNome: "DIVA LUISA TORQUATO",
  representanteRg: "17.247.126-6 SSP/SP",
  representanteCpf: "048.250.798-57",
  representanteCargo: "PROPRIETÁRIA",
  representanteNascimento: "29/01/1943",
  representanteEndereco:
    "RUA JOSE BONIFACIO, Nº 1.201, BAIRRO: CENTRO, PALMAS-TO, CEP: 77.006-000",
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
      "ROD. TO 010, KM 01, Nº SN - LOTE 12B GALPAO04 SALA 10AB, BAIRRO: ZONA RURAL",
    municipio: "PALMAS",
    estado: "TOCANTINS",
    cep: "77.249-899",
    assinaturaCidade: "PALMAS-TO",
    ...SHARED,
  },
  {
    id: "torquato-matriz-sumare",
    nomeFantasia: "Comercial Torquato — Matriz Sumaré/SP",
    razaoSocial: "D L TORQUATO LTDA",
    cnpj: "01.461.135/0001-17",
    inscricaoEstadual: "",
    email: "dlt.licitacao@gmail.com",
    endereco: "RUA CATARINA MORANZA BELINTANI, Nº 220, BAIRRO: JARDIM ALVORADA",
    municipio: "SUMARE",
    estado: "SP",
    cep: "13.170-740",
    assinaturaCidade: "SUMARE-SP",
    ...SHARED,
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
      "ROD. TO 010, KM 01, Nº S/Nº - LOTE 12B GALPAO04 SALA 10AB, BAIRRO: ZONA RURAL",
    municipio: "PALMAS",
    estado: "TOCANTINS",
    cep: "77.249-899",
    assinaturaCidade: "PALMAS-TO",
    ...SHARED,
  },
  {
    id: "prado-matriz-sumare",
    nomeFantasia: "Prado Comercial — Matriz Sumaré/SP",
    razaoSocial:
      "PRADO COMERCIO DE ELETRONICOS E SERV. DE INSTALACOES LTDA",
    cnpj: "04.602.194/0001-56",
    inscricaoEstadual: "",
    email: "licitacao@pradocomercial.com.br",
    endereco: "RUA CATARINA MORANZA BELINTANI, Nº 171, BAIRRO: JARDIM ALVORADA",
    municipio: "SUMARE",
    estado: "SP",
    cep: "13.170-740",
    assinaturaCidade: "SUMARE-SP",
    ...SHARED,
  },
];

export const DEFAULT_COMPANY_ID = "torquato-filial-palmas";

export function getCompanyById(id: string): CompanyProfile {
  return (
    COMPANY_PROFILES.find((company) => company.id === id) ?? COMPANY_PROFILES[0]
  );
}

export const DEFAULT_COMPANY_PROFILE = getCompanyById(DEFAULT_COMPANY_ID);
