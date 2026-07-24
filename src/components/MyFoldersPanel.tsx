"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock3, FolderOpen, Loader2, RefreshCw } from "lucide-react";

export interface FolderSummary {
  id: string;
  title: string;
  orgao: string;
  numero_pregao: string;
  expires_at: string;
  updated_at: string;
  analyses_count: number;
  proposals_count: number;
}

interface Props {
  supabaseEnabled: boolean;
  onSelectFolder?: (folderId: string) => void;
  refreshKey?: number;
}

export function MyFoldersPanel({
  supabaseEnabled,
  onSelectFolder,
  refreshKey = 0,
}: Props) {
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    if (!supabaseEnabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/history/folders");
      const data = (await response.json()) as {
        folders?: FolderSummary[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao carregar pastas.");
      }

      setFolders(data.folders ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pastas.");
    } finally {
      setLoading(false);
    }
  }, [supabaseEnabled]);

  useEffect(() => {
    void loadFolders();
  }, [loadFolders, refreshKey]);

  if (!supabaseEnabled) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-700" />
            Minhas licitações
          </h3>
          <p className="text-sm text-slate-600">
            Pastas organizadas por órgão/pregão. Expiram em 30 dias — o admin
            mantém o histórico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadFolders()}
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

      {!folders.length && !loading ? (
        <p className="text-sm text-slate-500">
          Nenhuma pasta ainda. Salve uma análise ou proposta para criar
          automaticamente.
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onSelectFolder?.(folder.id)}
            className="text-left rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 p-4 transition-colors"
          >
            <p className="font-medium text-slate-800">{folder.title}</p>
            <p className="text-sm text-slate-600 mt-1">
              {folder.analyses_count} análise(s) · {folder.proposals_count}{" "}
              proposta(s)
            </p>
            <p className="text-xs text-slate-500 mt-2 inline-flex items-center gap-1">
              <Clock3 className="w-3 h-3" />
              Expira em{" "}
              {new Date(folder.expires_at).toLocaleDateString("pt-BR")}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
