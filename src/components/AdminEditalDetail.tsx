"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  FileStack,
  Loader2,
  MessageCircle,
  Pencil,
  ScrollText,
} from "lucide-react";
import { AdminAuditEntryCard } from "@/components/AdminAuditEntryCard";
import type { AdminEditalSummary } from "@/lib/supabase/repository";

interface AuditEntry {
  id: string;
  user_email: string;
  folder_title: string;
  action: string;
  summary: string;
  created_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
  changes?: Record<string, unknown>;
}

type EditalTab = "detalhes" | "chat" | "propostas" | "alteracoes";

const TAB_ACTIONS: Record<EditalTab, Set<string> | null> = {
  detalhes: new Set(["analysis_saved", "analysis_edited", "analysis_section_edited"]),
  chat: new Set(["chat_message"]),
  propostas: new Set([
    "proposal_generated",
    "proposal_saved",
    "proposal_updated",
    "catalog_applied",
  ]),
  alteracoes: new Set([
    "analysis_edited",
    "analysis_section_edited",
    "item_field_edited",
    "proposal_item_added",
    "proposal_item_removed",
  ]),
};

interface Props {
  edital: AdminEditalSummary;
  onBack: () => void;
}

export function AdminEditalDetail({ edital, onBack }: Props) {
  const [tab, setTab] = useState<EditalTab>("detalhes");
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        view: "audit",
        folderId: edital.folder_id,
        limit: "200",
      });
      const response = await fetch(`/api/admin/dashboard?${params}`);
      const data = (await response.json()) as {
        items?: AuditEntry[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar edital.");
      setEntries(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar edital.");
    } finally {
      setLoading(false);
    }
  }, [edital.folder_id]);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const filtered = useMemo(() => {
    const allowed = TAB_ACTIONS[tab];
    if (!allowed) return entries;
    return entries.filter((entry) => allowed.has(entry.action));
  }, [entries, tab]);

  const tabs: Array<{ id: EditalTab; label: string; icon: typeof ScrollText; count: number }> =
    [
      {
        id: "detalhes",
        label: "Detalhes",
        icon: ScrollText,
        count: edital.analysis_count,
      },
      {
        id: "chat",
        label: "Chat",
        icon: MessageCircle,
        count: edital.chat_count,
      },
      {
        id: "propostas",
        label: "Propostas",
        icon: FileStack,
        count: edital.proposal_count,
      },
      {
        id: "alteracoes",
        label: "Alterações",
        icon: Pencil,
        count: edital.edits_count,
      },
    ];

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar aos editais
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{edital.title}</h2>
          <p className="text-sm text-slate-600 mt-1">
            {edital.orgao}
            {edital.numero_pregao ? ` · PE ${edital.numero_pregao}` : ""}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            <strong>{edital.user_email}</strong>
            {edital.user_name ? ` (${edital.user_name})` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="font-bold text-slate-800">{edital.analysis_count}</p>
            <p className="text-slate-500">Análises</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="font-bold text-slate-800">{edital.chat_count}</p>
            <p className="text-slate-500">Chat</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="font-bold text-slate-800">{edital.proposal_count}</p>
            <p className="text-slate-500">Propostas</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="font-bold text-slate-800">{edital.edits_count}</p>
            <p className="text-slate-500">Alterações</p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Expira em {new Date(edital.expires_at).toLocaleDateString("pt-BR")} ·
          Última atividade{" "}
          {new Date(edital.last_activity).toLocaleString("pt-BR")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              tab === id
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <AdminAuditEntryCard key={entry.id} entry={entry} />
          ))}

          {!filtered.length ? (
            <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-6 text-center">
              Nenhum registro nesta aba ainda.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
