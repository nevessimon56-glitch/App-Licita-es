"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  FolderOpen,
  Loader2,
  LogOut,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AuditEntry {
  id: string;
  user_email: string;
  folder_title: string;
  action: string;
  summary: string;
  created_at: string;
  changes?: Record<string, unknown>;
}

interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  folders_count: number;
  actions_count: number;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  analysis_saved: "Análise salva",
  proposal_saved: "Proposta salva",
  proposal_updated: "Proposta atualizada",
  item_field_edited: "Item editado",
};

export function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<"audit" | "users">("audit");
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ view });
      if (selectedUserId && view === "audit") {
        params.set("userId", selectedUserId);
      }

      const response = await fetch(`/api/admin/dashboard?${params}`);
      const data = (await response.json()) as {
        audit?: AuditEntry[];
        users?: UserSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar painel.");
      }

      if (view === "users") {
        setUsers(data.users ?? []);
      } else {
        setAudit(data.audit ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar painel.");
    } finally {
      setLoading(false);
    }
  }, [view, selectedUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold">Painel Admin</h1>
              <p className="text-sm text-slate-300">
                Histórico permanente — dados do usuário expiram em 30 dias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("audit")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              view === "audit"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            <Activity className="w-4 h-4" />
            Auditoria
          </button>
          <button
            type="button"
            onClick={() => setView("users")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              view === "users"
                ? "bg-white text-slate-900 shadow-sm"
                : "bg-slate-200 text-slate-700"
            }`}
          >
            <Users className="w-4 h-4" />
            Usuários
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-slate-300 bg-white"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Atualizar
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
            {error}
          </p>
        ) : null}

        {view === "users" ? (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-4 py-3">Usuário</th>
                  <th className="text-left px-4 py-3">Pastas</th>
                  <th className="text-left px-4 py-3">Ações</th>
                  <th className="text-left px-4 py-3">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {user.full_name || "—"}
                      </p>
                      <p className="text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">{user.folders_count}</td>
                    <td className="px-4 py-3">{user.actions_count}</td>
                    <td className="px-4 py-3">
                      {new Date(user.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setView("audit");
                        }}
                        className="text-blue-700 hover:underline"
                      >
                        Ver auditoria
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && !loading ? (
              <p className="p-6 text-slate-500 text-sm">Nenhum usuário ainda.</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {selectedUserId ? (
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="text-sm text-blue-700 hover:underline"
              >
                ← Ver todos os usuários
              </button>
            ) : null}

            {audit.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">
                      {entry.summary || ACTION_LABELS[entry.action] || entry.action}
                    </p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-medium">{entry.user_email || "Usuário"}</span>
                  {entry.folder_title ? ` — pasta: ${entry.folder_title}` : ""}
                </p>
                {entry.action === "item_field_edited" &&
                entry.changes &&
                typeof entry.changes === "object" ? (
                  <p className="text-xs text-slate-500 mt-2">
                    {(entry.changes as { field?: string }).field}:{" "}
                    <span className="line-through">
                      {(entry.changes as { de?: string }).de || "—"}
                    </span>
                    {" → "}
                    <span className="font-medium text-slate-700">
                      {(entry.changes as { para?: string }).para || "—"}
                    </span>
                  </p>
                ) : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(entry.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  {ACTION_LABELS[entry.action] ?? entry.action}
                </p>
              </div>
            ))}

            {!audit.length && !loading ? (
              <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
                Nenhuma ação registrada ainda. As ações aparecem quando usuários
                salvam análises ou propostas.
              </p>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
