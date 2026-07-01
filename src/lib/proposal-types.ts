export interface CompanyProfile {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  inscricaoEstadual: string;
  telefone: string;
  fax: string;
  email: string;
  endereco: string;
  municipio: string;
  estado: string;
  cep: string;
  banco: string;
  agencia: string;
  conta: string;
  representanteNome: string;
  representanteRg: string;
  representanteCpf: string;
  representanteCargo: string;
  representanteNascimento: string;
  representanteEndereco: string;
  assinaturaCidade: string;
}

export interface ProposalChecklistItem {
  categoria: string;
  item: string;
  requisitos: string;
}

export interface ProposalItem {
  numero: string;
  unidade: string;
  codigo: string;
  tituloProduto: string;
  descricao: string;
  descricaoComplementar: string;
  quantidade: number;
  fabricante: string;
  marcaModelo: string;
  semInstalacao: boolean;
  valorUnitario: number | null;
  valorTotal: number | null;
}

export interface CommercialConditions {
  validade: string;
  garantia: string;
  entrega: string;
  vigencia: string;
  pagamento: string;
}

export interface ProposalMetadata {
  referencia: string;
  orgao: string;
  objeto: string;
  processo: string;
  numeroPregao: string;
  enderecoOrgao: string;
  horarioSessao: string;
  criterioJulgamento: string;
  tipoPregao: string;
  enquadramento: string;
  lote: string;
}

export interface DeclarationSection {
  titulo: string;
  conteudo: string;
}

export interface ProposalPackage {
  checklist: ProposalChecklistItem[];
  metadata: ProposalMetadata;
  itens: ProposalItem[];
  condicoesComerciais: CommercialConditions;
  declaracoesProposta: string;
  declaracoesHabilitacao: DeclarationSection[];
  valorTotalExtenso: string;
  generatedAt: string;
  model: string;
}

export interface ProposalGenerateRequest {
  analysis: string;
  documents: { name: string; type: string; text: string }[];
  companyProfile?: Partial<CompanyProfile>;
}
