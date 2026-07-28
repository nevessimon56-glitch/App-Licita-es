"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminEditalDetail } from "@/components/AdminEditalDetail";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { AdminEditalSummary } from "@/lib/supabase/repository";

interface UserSummary {
  id: string;
  full_name: string;
  email: string;
  folders_count: number;
  actions_count: number;
  created_at: string;
}

interface DashboardStats {
  users_count: number;
  active_folders: number;
  archived_folders: number;
  audit_total: number;
  audit_today: number;
}

interface ArchivedFolder {
  id: string;
  title: string;
  orgao: string;
  numero_pregao: string;
  user_id: string;
  expires_at: string;
  updated_at: string;
}

type View = "editals" | "users" | "archived";

const PAGE_SIZE = 30;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function AdminDashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>("editals");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [editals, setEditals] = useState<AdminEditalSummary[]>([]);
  const [editalsTotal, setEditalsTotal] = useState(0);
  const [editalsPage, setEditalsPage] = useState(0);
  const [selectedEdital, setSelectedEdital] = useState<AdminEditalSummary | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [archived, setArchived] = useState<ArchivedFolder[]>([]);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [archivedPage, setArchivedPage] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingView, setLoadingView] = useState(false);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await fetch("/api/admin/dashboard?view=stats");
      const data = (await response.json()) as {
        stats?: DashboardStats;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar resumo.");
      setStats(data.stats ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar resumo.");
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingView(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/dashboard?view=users");
      const data = (await response.json()) as {
        users?: UserSummary[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar usuários.");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar usuários.");
    } finally {
      setLoadingView(false);
    }
  }, []);

  const loadEditals = useCallback(async () => {
    setLoadingView(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        view: "editals",
        limit: String(PAGE_SIZE),
        offset: String(editalsPage * PAGE_SIZE),
      });
      if (selectedUserId) params.set("userId", selectedUserId);
      if (searchQuery) params.set("search", searchQuery);

      const response = await fetch(`/api/admin/dashboard?${params}`);
      const data = (await response.json()) as {
        items?: AdminEditalSummary[];
        total?: number;
        error?: string;
      };

      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar editais.");
      setEditals(data.items ?? []);
      setEditalsTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar editais.");
    } finally {
      setLoadingView(false);
    }
  }, [editalsPage, selectedUserId, searchQuery]);

  const loadArchived = useCallback(async () => {
    setLoadingView(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        view: "archived",
        limit: String(PAGE_SIZE),
        offset: String(archivedPage * PAGE_SIZE),
      });
      const response = await fetch(`/api/admin/dashboard?${params}`);
      const data = (await response.json()) as {
        items?: ArchivedFolder[];
        total?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Erro ao carregar arquivo.");
      setArchived(data.items ?? []);
      setArchivedTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar arquivo.");
    } finally {
      setLoadingView(false);
    }
  }, [archivedPage]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (view === "users") void loadUsers();
    if (view === "editals" && !selectedEdital) void loadEditals();
    if (view === "archived") void loadArchived();
  }, [view, loadUsers, loadEditals, loadArchived, selectedEdital]);

  useEffect(() => {
    setEditalsPage(0);
  }, [selectedUserId, searchQuery]);

  async function handleRefresh() {
    setMessage(null);
    await loadStats();
    if (view === "users") await loadUsers();
    if (view === "editals" && !selectedEdital) await loadEditals();
    if (view === "archived") await loadArchived();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  async function handlePurge() {
    if (
      !window.confirm(
        "Arquivar pastas expiradas (30+ dias) e remover da visão dos usuários?"
      )
    ) {
      return;
    }

    setPurging(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/purge", { method: "POST" });
      const data = (await response.json()) as {
        purgedFolders?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Erro na limpeza.");
      setMessage(
        `Limpeza concluída: ${data.purgedFolders ?? 0} pasta(s) arquivada(s).`
      );
      await handleRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na limpeza.");
    } finally {
      setPurging(false);
    }
  }

  function handleSearchSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  }

  const editalsPageCount = Math.max(1, Math.ceil(editalsTotal / PAGE_SIZE));
  const archivedPageCount = Math.max(1, Math.ceil(archivedTotal / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold">Painel Admin</h1>
              <p className="text-sm text-slate-300">
                Gestão por edital · pastas do usuário expiram em 30 dias
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handlePurge()}
              disabled={purging}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-200 hover:bg-white/10 disabled:opacity-50"
            >
              {purging ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Limpar expirados
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {!selectedEdital ? (
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Usuários", value: stats?.users_count },
              { label: "Pastas ativas", value: stats?.active_folders },
              { label: "Arquivadas", value: stats?.archived_folders },
              { label: "Ações hoje", value: stats?.audit_today },
              { label: "Ações total", value: stats?.audit_total },
            ].map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {loadingStats ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  ) : (
                    (card.value ?? 0)
                  )}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        {!selectedEdital ? (
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["editals", "Editais", FolderOpen],
                ["users", "Usuários", Users],
                ["archived", "Arquivadas", Archive],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  view === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void handleRefresh()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-slate-300 bg-white"
            >
              {loadingView || loadingStats ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Atualizar
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-4">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
            {error}
          </p>
        ) : null}

        {selectedEdital ? (
          <AdminEditalDetail
            edital={selectedEdital}
            onBack={() => {
              setSelectedEdital(null);
              void loadEditals();
            }}
          />
        ) : null}

        {view === "editals" && !selectedEdital ? (
          <div className="space-y-4">
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-wrap gap-2"
            >
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por edital, órgão ou e-mail..."
                  className="w-full rounded-lg border border-slate-300 pl-10 pr-4 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm"
              >
                Buscar
              </button>
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSearchQuery("");
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm"
                >
                  Limpar
                </button>
              ) : null}
            </form>

            {selectedUser ? (
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setSelectedUserId(null)}
                  className="text-blue-700 hover:underline inline-flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Todos os editais
                </button>
                <span className="text-slate-500">
                  Filtrando: <strong>{selectedUser.email}</strong>
                </span>
              </div>
            ) : null}

            <div className="space-y-2">
              {editals.map((edital) => (
                <button
                  key={edital.folder_id}
                  type="button"
                  onClick={() => setSelectedEdital(edital)}
                  className="w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">
                        {edital.title}
                      </p>
                      <p className="text-sm text-slate-600 mt-0.5">
                        {edital.orgao}
                        {edital.numero_pregao ? ` · PE ${edital.numero_pregao}` : ""}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">{edital.user_email}</p>
                    </div>
                    <p className="text-xs text-slate-400 shrink-0">
                      {formatDate(edital.last_activity)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {edital.chat_count > 0 ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                        {edital.chat_count} chat{edital.chat_count !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {edital.proposal_count > 0 ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        {edital.proposal_count} proposta
                        {edital.proposal_count !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {edital.analysis_count > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {edital.analysis_count} análise
                        {edital.analysis_count !== 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {edital.edits_count > 0 ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {edital.edits_count} alteração
                        {edital.edits_count !== 1 ? "ões" : ""}
                      </span>
                    ) : null}
                    {edital.total_actions === 0 ? (
                      <span className="text-xs text-slate-400">Sem atividade registrada</span>
                    ) : null}
                  </div>
                </button>
              ))}

              {!editals.length && !loadingView ? (
                <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
                  Nenhum edital encontrado.
                </p>
              ) : null}
            </div>

            {editalsTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">
                  {editalsTotal} edital(is) · página {editalsPage + 1} de{" "}
                  {editalsPageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={editalsPage === 0 || loadingView}
                    onClick={() => setEditalsPage((page) => Math.max(0, page - 1))}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={editalsPage + 1 >= editalsPageCount || loadingView}
                    onClick={() => setEditalsPage((page) => page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {view === "users" && !selectedEdital ? (
          <div className="space-y-3">
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-x-auto">
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
                            setView("editals");
                          }}
                          className="text-blue-700 hover:underline"
                        >
                          Ver editais
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <p className="font-medium text-slate-800">
                    {user.full_name || user.email}
                  </p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  <p className="text-sm text-slate-600 mt-2">
                    {user.folders_count} pasta(s) · {user.actions_count} ação(ões)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setView("editals");
                    }}
                    className="mt-3 text-sm text-blue-700 hover:underline"
                  >
                    Ver editais
                  </button>
                </div>
              ))}
            </div>

            {!users.length && !loadingView ? (
              <p className="p-6 text-slate-500 text-sm bg-white rounded-xl border">
                Nenhum usuário ainda.
              </p>
            ) : null}
          </div>
        ) : null}

        {view === "archived" && !selectedEdital ? (
          <div className="space-y-3">
            {archived.map((folder) => (
              <div
                key={folder.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <p className="font-medium text-slate-800">{folder.title}</p>
                <p className="text-sm text-slate-600 mt-1">
                  {folder.orgao}
                  {folder.numero_pregao ? ` — PE ${folder.numero_pregao}` : ""}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  Expirou em{" "}
                  {new Date(folder.expires_at).toLocaleDateString("pt-BR")} ·
                  arquivada em{" "}
                  {new Date(folder.updated_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
            ))}

            {!archived.length && !loadingView ? (
              <p className="text-sm text-slate-500 bg-white rounded-xl border border-slate-200 p-6">
                Nenhuma pasta arquivada ainda.
              </p>
            ) : null}

            {archivedTotal > PAGE_SIZE ? (
              <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm text-slate-600">
                  {archivedTotal} pasta(s) · página {archivedPage + 1} de{" "}
                  {archivedPageCount}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={archivedPage === 0 || loadingView}
                    onClick={() =>
                      setArchivedPage((page) => Math.max(0, page - 1))
                    }
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={
                      archivedPage + 1 >= archivedPageCount || loadingView
                    }
                    onClick={() => setArchivedPage((page) => page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm disabled:opacity-50"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {loadingView && !selectedEdital ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : null}
      </main>
    </div>
  );
}
