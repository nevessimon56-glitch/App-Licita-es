"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, FileStack, Mail, MessageCircle } from "lucide-react";
import { AnalysisResult } from "./AnalysisResult";
import { AnalysisHistoryPanel } from "./AnalysisHistoryPanel";
import { ChatPanel } from "./ChatPanel";
import { EmailPanel } from "./EmailPanel";
import { ProposalHistoryPanel } from "./ProposalHistoryPanel";
import { ProposalPanel } from "./ProposalPanel";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { DEFAULT_COMPANY_ID, getCompanyById } from "@/lib/company-defaults";
import { applyStandardProposalPackage } from "@/lib/proposal-template";
import type { CompanyProfile, ProposalPackage } from "@/lib/proposal-types";
import type { RestoredAnalysisRecord } from "@/lib/restore-analysis";
import { buildAnalysisEditAudit } from "@/lib/analysis-edit-audit";
import { auditUserEvent } from "@/lib/history-client";
import { isSupabaseEnabled } from "@/lib/supabase/config";

type Tab = "analysis" | "email" | "proposal" | "chat";

interface Props {
  result: AnalysisResponse;
  folderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
  onHistoryRefresh?: () => void;
  historyRefreshKey?: number;
}

export function ResultsTabs({
  result,
  folderId = null,
  onFolderChange,
  onHistoryRefresh,
  historyRefreshKey = 0,
}: Props) {
  const supabaseEnabled = isSupabaseEnabled();
  const [activeTab, setActiveTab] = useState<Tab>("analysis");
  const [analysisMarkdown, setAnalysisMarkdown] = useState(result.analysis);
  const [proposalPackage, setProposalPackage] = useState<ProposalPackage | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(DEFAULT_COMPANY_ID);
  const [companyProfile, setCompanyProfile] = useState(() =>
    getCompanyById(DEFAULT_COMPANY_ID)
  );
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(
    result.savedAnalysisId ?? null
  );
  const [savedProposalId, setSavedProposalId] = useState<string | null>(null);
  const [proposalAutoSaved, setProposalAutoSaved] = useState(false);
  const originalAnalysisRef = useRef(result.analysis);

  useEffect(() => {
    originalAnalysisRef.current = result.analysis;
    setAnalysisMarkdown(result.analysis);
    setProposalPackage(null);
    setProposalError(null);
    setSavedAnalysisId(result.savedAnalysisId ?? null);
    setSavedProposalId(null);
    setProposalAutoSaved(false);
    if (result.savedFolderId) {
      onFolderChange?.(result.savedFolderId);
    }
  }, [result, onFolderChange]);

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
          analysisId: savedAnalysisId,
          folderId,
          proposalId: savedProposalId,
          originalAnalysis: originalAnalysisRef.current,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Erro ao gerar proposta.");
      }

      setProposalPackage(payload.package);
      if (supabaseEnabled) {
        const editAudit = buildAnalysisEditAudit(
          originalAnalysisRef.current,
          analysisMarkdown
        );
        if (editAudit) {
          void auditUserEvent({
            action: "analysis_edited",
            summary: `Resumo alterado antes da proposta (${editAudit.secoes_alteradas_count} seção(ões))`,
            folderId,
            entityType: "analysis",
            entityId: savedAnalysisId,
            changes: {
              ...editAudit,
              contexto: "antes de gerar proposta",
            },
          });
        }
      }

      if (payload.autoSaved && payload.savedProposalId) {
        setSavedProposalId(payload.savedProposalId);
        setProposalAutoSaved(true);
        if (payload.savedFolderId) {
          onFolderChange?.(payload.savedFolderId);
        }
        onHistoryRefresh?.();
      } else {
        setSavedProposalId(null);
        setProposalAutoSaved(false);
      }
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
  }, [analysisMarkdown, companyProfile, result.documents, savedAnalysisId, folderId, savedProposalId, onFolderChange, onHistoryRefresh, supabaseEnabled]);

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

  const handleLoadProposal = (
    pkg: ProposalPackage,
    proposalId: string,
    companyId: string,
    loadedFolderId?: string | null
  ) => {
    const company = getCompanyById(companyId);
    setProposalPackage(pkg);
    setSavedProposalId(proposalId);
    setSelectedCompanyId(companyId);
    setCompanyProfile(company);
    setProposalError(null);
    if (loadedFolderId) {
      onFolderChange?.(loadedFolderId);
    }
    setActiveTab("proposal");
  };

  const handleLoadAnalysis = (analysis: RestoredAnalysisRecord) => {
    setAnalysisMarkdown(analysis.analysis_markdown);
    setSavedAnalysisId(analysis.id);
    onFolderChange?.(analysis.folder_id);
    setActiveTab("analysis");
  };

  const handleAnalysisSaved = (analysisId: string, newFolderId?: string | null) => {
    setSavedAnalysisId(analysisId);
    if (newFolderId) onFolderChange?.(newFolderId);
    onHistoryRefresh?.();
  };

  const handleProposalSaved = (proposalId: string, newFolderId?: string | null) => {
    setSavedProposalId(proposalId);
    if (newFolderId) onFolderChange?.(newFolderId);
    onHistoryRefresh?.();
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
        <div className="space-y-4">
          <AnalysisHistoryPanel
            supabaseEnabled={supabaseEnabled}
            folderId={folderId}
            refreshKey={historyRefreshKey}
            onLoadAnalysis={handleLoadAnalysis}
          />
          <AnalysisResult
            result={editableResult}
            onAnalysisChange={setAnalysisMarkdown}
            supabaseEnabled={supabaseEnabled}
            savedAnalysisId={savedAnalysisId}
            folderId={folderId}
            originalAnalysis={originalAnalysisRef.current}
            auditContext={{
              folderId,
              analysisId: savedAnalysisId,
              proposalId: savedProposalId,
            }}
            onAnalysisSaved={handleAnalysisSaved}
          />
        </div>
      ) : activeTab === "email" ? (
        <EmailPanel result={editableResult} />
      ) : activeTab === "proposal" ? (
        <div className="space-y-4">
          {proposalAutoSaved ? (
            <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              Proposta <strong>salva automaticamente</strong> no histórico.
            </p>
          ) : null}
          <ProposalHistoryPanel
            supabaseEnabled={supabaseEnabled}
            onLoadProposal={handleLoadProposal}
            refreshKey={historyRefreshKey}
          />
          <ProposalPanel
            result={editableResult}
            proposalPackage={proposalPackage}
            companyProfile={companyProfile}
            selectedCompanyId={selectedCompanyId}
            loading={proposalLoading}
            error={proposalError}
            supabaseEnabled={supabaseEnabled}
            savedProposalId={savedProposalId}
            savedAnalysisId={savedAnalysisId}
            folderId={folderId}
            onGenerate={handleGenerateProposal}
            onPackageChange={setProposalPackage}
            onCompanyChange={handleCompanyChange}
            onSelectCompany={handleSelectCompany}
            onProposalSaved={handleProposalSaved}
          />
        </div>
      ) : (
        <ChatPanel
          result={editableResult}
          folderId={folderId}
          analysisId={savedAnalysisId}
        />
      )}
    </div>
  );
}
