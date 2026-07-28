"use client";

import { CheckCircle2, Database } from "lucide-react";

interface Props {
  fromCache?: boolean;
  autoSaved?: boolean;
}

export function AutoSaveNotice({ fromCache, autoSaved }: Props) {
  if (!fromCache && !autoSaved) return null;

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {fromCache ? (
        <p className="flex items-center gap-2 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm">
          <Database className="w-4 h-4 shrink-0" />
          <span>
            <strong>Cache:</strong> mesmo edital detectado — análise reutilizada sem
            gastar tokens do Gemini.
          </span>
        </p>
      ) : null}
      {autoSaved ? (
        <p className="flex items-center gap-2 text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>
            <strong>Salvo automaticamente</strong> em Minhas licitações.
          </span>
        </p>
      ) : null}
    </div>
  );
}
