import type { Content } from "pdfmake/interfaces";
import {
  PROPOSAL_PDF_COLORS,
  PROPOSAL_PDF_FONT,
  formatConditionForExport,
} from "./proposal-export-styles";
import { buildProposalCompanyHeader } from "./proposal-layout";
import type { CompanyProfile, ProposalPackage } from "./proposal-types";

const COLORS = PROPOSAL_PDF_COLORS;
const FONT = PROPOSAL_PDF_FONT;

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

function sanitize(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\0/g, "");
}

export function isTorquatoCompany(company: CompanyProfile): boolean {
  return company.id.startsWith("torquato");
}

export function formatProposalSignatureDate(city: string, date = new Date()): string {
  const day = date.getDate();
  const month = MESES[date.getMonth()];
  const year = date.getFullYear();
  return `DATA: ${city.toUpperCase()} - ${day} DE ${month} DE ${year}.`;
}

export function formatDigitalSignatureStamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} -03'00'`;
}

export function buildCompanyHeaderContent(company: CompanyProfile): Content[] {
  const lines = buildProposalCompanyHeader(company).filter(Boolean);
  const content: Content[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("ENDEREÇO:") && line.includes("MUNICÍPIO:")) {
      const splitAt = line.indexOf("MUNICÍPIO:");
      content.push({
        text: sanitize(line.slice(0, splitAt).trim()),
        style: "companyDetail",
      });
      content.push({
        text: sanitize(line.slice(splitAt).trim()),
        style: "companyDetail",
        margin: [0, 0, 0, 1],
      });
      continue;
    }

    content.push({
      text: sanitize(line),
      style: i === 0 ? "companyName" : "companyDetail",
      margin: [0, 0, 0, i === 0 ? 2 : 1],
    });
  }

  return content;
}

function labeledLine(label: string, value: string, margin: [number, number, number, number] = [0, 0, 0, 2]): Content {
  return {
    text: [
      { text: `${label} `, bold: true, fontSize: FONT.table },
      { text: sanitize(formatConditionForExport(value)), fontSize: FONT.table },
    ],
    lineHeight: FONT.lineHeight,
    margin,
  };
}

function tableLayout() {
  return {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => COLORS.border,
    vLineColor: () => COLORS.border,
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 3,
    paddingBottom: () => 3,
  };
}

function sectionGrayBar(title: string, margin: [number, number, number, number] = [0, 6, 0, 3]): Content {
  return {
    table: {
      widths: ["*"],
      body: [
        [
          {
            text: sanitize(title),
            bold: true,
            fontSize: FONT.table,
            fillColor: COLORS.headerBg,
            margin: [3, 4, 3, 4],
          },
        ],
      ],
    },
    layout: tableLayout(),
    margin,
  };
}

/** Layout original: sem bloco INFORMAÇÕES, campos em texto corrido */
export function buildMetadataContent(pkg: ProposalPackage, company: CompanyProfile): Content[] {
  const bankDetails = `${company.banco.toUpperCase()} - AGENCIA: ${company.agencia} - CONTA CORRENTE: ${company.conta}`;

  return [
    labeledLine("ORGÃO:", pkg.metadata.orgao),
    labeledLine("OBJETO:", pkg.metadata.objeto),
    labeledLine("PROCESSO:", pkg.metadata.processo),
    labeledLine("ENDEREÇO DO ÓRGÃO:", pkg.metadata.enderecoOrgao),
    labeledLine("CRITERIO DE JULGAMENTO:", pkg.metadata.criterioJulgamento),
    {
      text: [
        { text: "HORARIO: ", bold: true, fontSize: FONT.table },
        { text: sanitize(formatConditionForExport(pkg.metadata.horarioSessao)), fontSize: FONT.table },
      ],
      alignment: "right",
      lineHeight: FONT.lineHeight,
      margin: [0, 0, 0, 6] as [number, number, number, number],
    },
    {
      table: {
        widths: [92, "*"],
        body: [
          [
            {
              text: "DADOS BANCARIOS:",
              bold: true,
              fontSize: FONT.table,
              fillColor: "#C0C0C0",
              margin: [3, 4, 3, 4],
            },
            {
              text: sanitize(bankDetails),
              fontSize: FONT.table,
              fillColor: COLORS.headerBg,
              margin: [3, 4, 3, 4],
            },
          ],
        ],
      },
      layout: tableLayout(),
      margin: [0, 0, 0, 8] as [number, number, number, number],
    },
  ];
}

export function buildSignatureContent(
  company: CompanyProfile,
  digitalNotice: string
): Content[] {
  const nascimento = company.representanteNascimento
    ? `, DATA DE NASCIMENTO: ${company.representanteNascimento}`
    : "";
  const cpfDigits = company.representanteCpf.replace(/\D/g, "");
  const nome = company.representanteNome.toUpperCase();

  const content: Content[] = [
    {
      text: formatProposalSignatureDate(company.assinaturaCidade),
      fontSize: FONT.table,
      alignment: "center",
      margin: [0, 8, 0, 6],
    },
    labeledLine("NOME:", company.representanteNome),
    {
      text: `RG SOB Nº ${company.representanteRg}`,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: `CPF SOB Nº ${company.representanteCpf}`,
      fontSize: FONT.table,
      margin: [0, 0, 0, 6],
    },
    sectionGrayBar(
      "CASO A EMPRESA VENHA SAGRAR-SE VENCEDOR(A) DO CERTAME, SEGUEM OS DADOS DO(A) REPRESENTANTE LEGAL PARA ASSINAR O CONTRATO:"
    ),
    {
      text: nome,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: company.representanteRg,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: company.representanteCpf,
      fontSize: FONT.table,
      margin: [0, 0, 0, 2],
    },
    {
      text: `CARGO: ${company.representanteCargo.toUpperCase()}${nascimento}, ENDEREÇO: ${company.representanteEndereco.toUpperCase()}`,
      fontSize: FONT.table,
      lineHeight: FONT.lineHeight,
      margin: [0, 0, 0, 8],
    },
  ];

  if (isTorquatoCompany(company)) {
    content.push({
      columns: [
        {
          width: "*",
          text: `${nome}:${cpfDigits}`,
          fontSize: FONT.totalAmount,
          bold: true,
          margin: [0, 4, 8, 0],
        },
        {
          width: "auto",
          text: `Assinado de forma digital por ${nome}:${cpfDigits} Dados: ${formatDigitalSignatureStamp()}`,
          fontSize: FONT.tableSmall,
          alignment: "right",
          lineHeight: 1.1,
          margin: [0, 8, 0, 0],
        },
      ],
      margin: [0, 0, 0, 8],
    });
  }

  content.push({
    text: digitalNotice,
    fontSize: FONT.tableSmall,
    alignment: "center",
    lineHeight: 1.1,
    margin: [0, 4, 0, 0],
  });

  return content;
}

export { labeledLine, sectionGrayBar, tableLayout };
