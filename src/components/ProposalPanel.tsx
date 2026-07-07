"use client";

import { useMemo, useState } from "react";
import {
  Check,
  ClipboardList,
  Copy,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Save,
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
import { getValorTotalExtenso } from "@/lib/proposal-layout";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";
import { CompanySelector } from "./CompanySelector";
import { ProposalEmailPanel } from "./ProposalEmailPanel";
import { ProposalExportButtons } from "./ProposalExportButtons";
import { ProposalItemsEditor } from "./ProposalItemsEditor";
import { saveProposalToHistory } from "@/lib/history-client";

type SubTab = "checklist" | "itens" | "proposta" | "declaracoes" | "email";

interface Props {
  result: AnalysisResponse;
  proposalPackage: ProposalPackage | null;
  companyProfile: CompanyProfile;
  selectedCompanyId: string;
  loading: boolean;
  error: string | null;
  supabaseEnabled?: boolean;
  savedProposalId?: string | null;
  savedAnalysisId?: string | null;
  onGenerate: () => void;
  onPackageChange: (pkg: ProposalPackage) => void;
  onCompanyChange: (company: CompanyProfile) => void;
  onSelectCompany: (company: CompanyProfile) => void;
  onProposalSaved?: (proposalId: string) => void;
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
  selectedCompanyId,
  loading,
  error,
  supabaseEnabled = false,
  savedProposalId = null,
  savedAnalysisId = null,
  onGenerate,
  onPackageChange,
  onCompanyChange,
  onSelectCompany,
  onProposalSaved,
}: Props) {
  const [subTab, setSubTab] = useState<SubTab>("checklist");
  const [showCompany, setShowCompany] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  async function handleSaveProposal() {
    if (!pkg || !supabaseEnabled) return;

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const { proposal } = await saveProposalToHistory({
        pkg,
        companyId: selectedCompanyId,
        analysisId: savedAnalysisId,
        proposalId: savedProposalId ?? undefined,
      });
      onProposalSaved?.(proposal.id);
      setSaveMessage(
        savedProposalId
          ? "Proposta atualizada no histórico."
          : "Proposta salva no histórico."
      );
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Erro ao salvar proposta."
      );
    } finally {
      setSaving(false);
    }
  }

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
          Selecione a empresa e gere a proposta no layout padrão com base em{" "}
          <strong>{result.documentSummary.length}</strong> documento(s).
        </p>
        <div className="max-w-3xl mx-auto text-left">
          <CompanySelector
            selectedId={selectedCompanyId}
            onSelect={onSelectCompany}
          />
        </div>
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
    { id: "email", label: "E-mail", icon: Mail },
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
            {supabaseEnabled ? (
              <button
                type="button"
                onClick={() => void handleSaveProposal()}
                disabled={saving}
                className="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savedProposalId ? "Atualizar histórico" : "Salvar no histórico"}
              </button>
            ) : null}
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

        {saveMessage ? (
          <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            {saveMessage}
          </p>
        ) : null}
        {saveError ? (
          <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {saveError}
          </p>
        ) : null}

        <div className="mt-4">
          <CompanySelector
            selectedId={selectedCompanyId}
            onSelect={onSelectCompany}
          />
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
            supabaseEnabled={supabaseEnabled}
          />
        </div>
      )}

      {subTab === "proposta" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap justify-between items-start gap-3">
            <ProposalExportButtons
              pkg={pkg}
              company={companyProfile}
              kind="proposta"
            />
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
                ["orgao", "Órgão"],
                ["objeto", "Objeto"],
                ["tipoPregao", "Modalidade (ex.: PREGÃO ELETRÔNICO)"],
                ["numeroPregao", "Número do pregão"],
                ["processo", "Processo"],
                ["referencia", "Referência completa (declarações)"],
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
            <span>
              Valor total por extenso{" "}
              <span className="text-slate-500 font-normal">
                (calculado automaticamente — edite se quiser outro texto)
              </span>
            </span>
            <input
              value={pkg.valorTotalExtenso || getValorTotalExtenso(pkg)}
              onChange={(e) => updatePackage({ valorTotalExtenso: e.target.value })}
              placeholder="Ex.: QUARENTA E SEIS MIL, TREZENTOS E CINQUENTA REAIS"
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
          <div className="flex flex-wrap justify-between items-start gap-3">
            <ProposalExportButtons
              pkg={pkg}
              company={companyProfile}
              kind="declaracoes"
            />
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

      {subTab === "email" && (
        <ProposalEmailPanel
          pkg={pkg}
          onEmailChange={(email) => updatePackage({ email })}
        />
      )}
    </section>
  );
}
