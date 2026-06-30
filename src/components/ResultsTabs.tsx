"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, FileStack, Mail, MessageCircle } from "lucide-react";
import { AnalysisResult } from "./AnalysisResult";
import { ChatPanel } from "./ChatPanel";
import { EmailPanel } from "./EmailPanel";
import { ProposalPanel } from "./ProposalPanel";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { DEFAULT_COMPANY_ID, getCompanyById } from "@/lib/company-defaults";
import { applyStandardProposalPackage } from "@/lib/proposal-template";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";

type Tab = "analysis" | "email" | "proposal" | "chat";

interface Props {
  result: AnalysisResponse;
}

export function ResultsTabs({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [analysisMarkdown, setAnalysisMarkdown] = useState(result.analysis);
  const [proposalPackage, setProposalPackage] = useState<ProposalPackage | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(DEFAULT_COMPANY_ID);
  const [companyProfile, setCompanyProfile] = useState(() =>
    getCompanyById(DEFAULT_COMPANY_ID)
  );
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);

  useEffect(() => {
    setAnalysisMarkdown(result.analysis);
    setProposalPackage(null);
    setProposalError(null);
  }, [result]);

  const editableResult: AnalysisResponse = {
    ...result,
    analysis: analysisMarkdown,
  };

  const handleGenerateProposal = useCallback(async () => {
    setProposalLoading(true);
    setProposalError(null);

    try {
      const response = await fetch("/api/proposal/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: analysisMarkdown,
          documents: result.documents,
          companyProfile,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Erro ao gerar proposta.");
      }

      setProposalPackage(payload.package);
      if (payload.companyProfile) {
        setCompanyProfile(payload.companyProfile);
      }
    } catch (err) {
      setProposalError(
        err instanceof Error ? err.message : "Erro ao gerar proposta."
      );
    } finally {
      setProposalLoading(false);
    }
  }, [analysisMarkdown, companyProfile, result.documents]);

  const handleSelectCompany = (company: CompanyProfile) => {
    setSelectedCompanyId(company.id);
    setCompanyProfile(company);
    if (proposalPackage) {
      setProposalPackage(applyStandardProposalPackage(proposalPackage, company));
    }
  };

  const handleCompanyChange = (company: CompanyProfile) => {
    setCompanyProfile(company);
    if (proposalPackage) {
      setProposalPackage(applyStandardProposalPackage(proposalPackage, company));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "analysis"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Resumo
        </button>
        <button
          onClick={() => setActiveTab("email")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "email"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          E-mail
        </button>
        <button
          onClick={() => setActiveTab("proposal")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "proposal"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <FileStack className="w-4 h-4" />
          Propostas
          {proposalPackage && (
            <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden />
          )}
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-white text-blue-800 shadow-sm"
              : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
      </div>

      {activeTab === "analysis" ? (
        <AnalysisResult
          result={editableResult}
          onAnalysisChange={setAnalysisMarkdown}
        />
      ) : activeTab === "email" ? (
        <EmailPanel result={editableResult} />
      ) : activeTab === "proposal" ? (
        <ProposalPanel
          result={editableResult}
          proposalPackage={proposalPackage}
          companyProfile={companyProfile}
          selectedCompanyId={selectedCompanyId}
          loading={proposalLoading}
          error={proposalError}
          onGenerate={handleGenerateProposal}
          onPackageChange={setProposalPackage}
          onCompanyChange={handleCompanyChange}
          onSelectCompany={handleSelectCompany}
        />
      ) : (
        <ChatPanel result={editableResult} />
      )}
    </div>
  );
}
