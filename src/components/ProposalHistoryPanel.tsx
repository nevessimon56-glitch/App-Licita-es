"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, FileStack, Loader2, RefreshCw } from "lucide-react";
import type { ProposalPackage } from "@/lib/proposal-types";
import { getCompanyById } from "@/lib/company-defaults";
import { applyStandardProposalPackage } from "@/lib/proposal-template";
import { formatCurrencyBRL } from "@/lib/proposal-document";
import { loadProposalFromHistory } from "@/lib/history-client";

interface ProposalSummary {
  id: string;
  title: string;
  orgao: string;
  numero_pregao: string;
  grand_total: number | null;
  company_id: string;
  updated_at: string;
}

interface Props {
  onLoadProposal: (pkg: ProposalPackage, proposalId: string, companyId: string) => void;
  supabaseEnabled: boolean;
  refreshKey?: number;
}

export function ProposalHistoryPanel({
  onLoadProposal,
  supabaseEnabled,
  refreshKey = 0,
}: Props) {
  const [proposals, setProposals] = useState<ProposalSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!supabaseEnabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/history/proposals");
      const data = (await response.json()) as {
        proposals?: ProposalSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar histórico.");
      }

      setProposals(data.proposals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory, refreshKey]);

  async function handleOpen(proposalId: string, companyId: string) {
    setLoading(true);
    setError(null);

    try {
      const data = await loadProposalFromHistory(proposalId);
      const company = getCompanyById(companyId);
      const pkg = applyStandardProposalPackage(
        data.proposal.package_data,
        company
      );

      onLoadProposal(pkg, proposalId, companyId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir proposta.");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseEnabled) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-sm text-slate-600">
        Configure o Supabase no Render para habilitar histórico por usuário.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Clock3 className="w-5 h-5 text-blue-700" />
            Histórico de propostas
          </h3>
          <p className="text-sm text-slate-600">
            Reabra propostas salvas sem precisar gerar tudo de novo.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Atualizar
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!proposals.length && !loading ? (
        <p className="text-sm text-slate-500">
          Nenhuma proposta salva ainda. Gere uma proposta e clique em{" "}
          <strong>Salvar no histórico</strong>.
        </p>
      ) : null}

      <div className="space-y-3">
        {proposals.map((proposal) => (
          <button
            key={proposal.id}
            type="button"
            onClick={() => void handleOpen(proposal.id, proposal.company_id)}
            className="w-full text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800">{proposal.title}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {proposal.orgao}
                  {proposal.numero_pregao
                    ? ` — PE ${proposal.numero_pregao}`
                    : ""}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Atualizado em{" "}
                  {new Date(proposal.updated_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-800">
                  {formatCurrencyBRL(proposal.grand_total)}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 mt-2">
                  <FileStack className="w-3 h-3" />
                  Abrir
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
