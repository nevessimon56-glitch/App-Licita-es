"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  FileText,
  Loader2,
  RefreshCw,
  ScrollText,
  Settings2,
} from "lucide-react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import {
  buildChecklistText,
  buildDeclarationsDocumentText,
  buildProposalDocumentText,
  formatCurrencyBRL,
  getProposalGrandTotal,
  recalculateProposalTotals,
} from "@/lib/proposal-document";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";
import { ProposalItemsEditor } from "./ProposalItemsEditor";

type SubTab = "checklist" | "itens" | "proposta" | "declaracoes";

interface Props {
  result: AnalysisResponse;
  proposalPackage: ProposalPackage | null;
  companyProfile: CompanyProfile;
  loading: boolean;
  error: string | null;
  onGenerate: () => void;
  onPackageChange: (pkg: ProposalPackage) => void;
  onCompanyChange: (company: CompanyProfile) => void;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copiado!" : label}
    </button>
  );
}

export function ProposalPanel({
  result,
  proposalPackage,
  companyProfile,
  loading,
  error,
  onGenerate,
  onPackageChange,
  onCompanyChange,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("checklist");
  const [showCompany, setShowCompany] = useState(false);

  const pkg = useMemo(
    () => (proposalPackage ? recalculateProposalTotals(proposalPackage) : null),
    [proposalPackage]
  );

  const proposalText = useMemo(
    () => (pkg ? buildProposalDocumentText(pkg, companyProfile) : ""),
    [pkg, companyProfile]
  );

  const declarationsText = useMemo(
    () => (pkg ? buildDeclarationsDocumentText(pkg, companyProfile) : ""),
    [pkg, companyProfile]
  );

  const checklistText = useMemo(
    () => (pkg ? buildChecklistText(pkg) : ""),
    [pkg]
  );

  const grandTotal = pkg ? getProposalGrandTotal(pkg) : 0;

  const updatePackage = (patch: Partial<ProposalPackage>) => {
    if (!pkg) return;
    onPackageChange({ ...pkg, ...patch });
  };

  if (!pkg) {
    return (
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-700">
          <ScrollText className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">
          Propostas e Declarações
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          Com base no resumo de <strong>{result.documentSummary.length}</strong>{" "}
          documento(s), o sistema elabora o check-list de habilitação, a lista de
          itens no formato da proposta comercial, as declarações e a estrutura
          para preenchimento de preços.
        </p>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-xl font-medium hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
          {loading ? "Gerando proposta..." : "Gerar proposta e declarações"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>
    );
  }

  const subTabs: { id: SubTab; label: string; icon: typeof ClipboardList }[] = [
    { id: "checklist", label: "Check-list", icon: ClipboardList },
    { id: "itens", label: "Itens", icon: FileText },
    { id: "proposta", label: "Proposta", icon: ScrollText },
    { id: "declaracoes", label: "Declarações", icon: FileText },
  ];

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Propostas e Declarações
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Layout padrão fixo (proposta + declarações). Edite preços, itens e
              dados da empresa. Total atual:{" "}
              <strong>{formatCurrencyBRL(grandTotal)}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCompany((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <Settings2 className="w-4 h-4" />
              Dados da empresa
            </button>
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Regenerar
            </button>
          </div>
        </div>

        {showCompany && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            {(
              [
                ["razaoSocial", "Razão social"],
                ["cnpj", "CNPJ"],
                ["inscricaoEstadual", "Inscrição estadual"],
                ["telefone", "Telefone"],
                ["email", "E-mail"],
                ["endereco", "Endereço"],
                ["representanteNome", "Representante"],
                ["representanteRg", "RG"],
                ["representanteCpf", "CPF"],
                ["banco", "Banco"],
                ["agencia", "Agência"],
                ["conta", "Conta"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="proposal-field">
                <span>{label}</span>
                <input
                  value={companyProfile[key]}
                  onChange={(e) =>
                    onCompanyChange({ ...companyProfile, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1 mt-4 p-1 bg-slate-100 rounded-xl w-fit">
          {subTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSubTab(id)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                subTab === id
                  ? "bg-white text-blue-800 shadow-sm"
                  : "text-slate-600"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </p>
      )}

      {subTab === "checklist" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex justify-end">
            <CopyButton text={checklistText} label="Copiar check-list" />
          </div>
          <div className="space-y-4">
            {pkg.checklist.map((entry, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="proposal-edit-inline"
                  value={entry.categoria}
                  onChange={(e) => {
                    const checklist = [...pkg.checklist];
                    checklist[index] = { ...entry, categoria: e.target.value };
                    updatePackage({ checklist });
                  }}
                />
                <input
                  className="proposal-edit-inline"
                  value={entry.item}
                  onChange={(e) => {
                    const checklist = [...pkg.checklist];
                    checklist[index] = { ...entry, item: e.target.value };
                    updatePackage({ checklist });
                  }}
                />
                <textarea
                  className="proposal-edit-inline min-h-[60px]"
                  value={entry.requisitos}
                  onChange={(e) => {
                    const checklist = [...pkg.checklist];
                    checklist[index] = { ...entry, requisitos: e.target.value };
                    updatePackage({ checklist });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "itens" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <ProposalItemsEditor
            itens={pkg.itens}
            onChange={(itens) => updatePackage({ itens })}
          />
        </div>
      )}

      {subTab === "proposta" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex justify-end gap-2">
            <CopyButton text={proposalText} label="Copiar proposta" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              [
                ["validade", "Validade"],
                ["garantia", "Garantia"],
                ["entrega", "Entrega"],
                ["vigencia", "Vigência"],
                ["pagamento", "Pagamento"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="proposal-field md:col-span-1">
                <span>{label}</span>
                <textarea
                  rows={2}
                  value={pkg.condicoesComerciais[key]}
                  onChange={(e) =>
                    updatePackage({
                      condicoesComerciais: {
                        ...pkg.condicoesComerciais,
                        [key]: e.target.value,
                      },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="proposal-field">
            <span>Declarações da proposta (A, B, C) — layout fixo</span>
            <textarea
              rows={5}
              value={pkg.declaracoesProposta}
              readOnly
              className="bg-slate-100"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(
              [
                ["referencia", "Referência"],
                ["orgao", "Órgão"],
                ["objeto", "Objeto"],
                ["processo", "Processo"],
                ["horarioSessao", "Horário da sessão"],
                ["criterioJulgamento", "Critério de julgamento"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="proposal-field">
                <span>{label}</span>
                <input
                  value={pkg.metadata[key]}
                  onChange={(e) =>
                    updatePackage({
                      metadata: { ...pkg.metadata, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <label className="proposal-field">
            <span>Valor total por extenso</span>
            <input
              value={pkg.valorTotalExtenso}
              onChange={(e) => updatePackage({ valorTotalExtenso: e.target.value })}
              placeholder="Ex.: QUATRO MILHÕES, CENTO E ONZE MIL..."
            />
          </label>
          <textarea
            className="proposal-preview-textarea"
            value={proposalText}
            readOnly
            rows={24}
          />
        </div>
      )}

      {subTab === "declaracoes" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Declarações no formato padrão fixo (Anexo 2 ME/EPP + Anexo 4
            Unificada). O texto é gerado automaticamente com os dados da empresa
            e do edital.
          </p>
          <div className="flex justify-end">
            <CopyButton text={declarationsText} label="Copiar declarações" />
          </div>
          {pkg.declaracoesHabilitacao.map((section, index) => (
            <div key={index} className="space-y-2">
              <p className="font-semibold text-slate-800 uppercase text-sm">
                {section.titulo}
              </p>
              <textarea
                className="proposal-preview-textarea bg-slate-50"
                value={section.conteudo}
                readOnly
                rows={14}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
