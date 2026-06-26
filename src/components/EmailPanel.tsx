"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Mail, RotateCcw } from "lucide-react";
import type { AnalysisResponse } from "@/lib/analysis-prompt";
import { buildEmailFromAnalysis } from "@/lib/email-template";

interface Props {
  result: AnalysisResponse;
}

export function EmailPanel({ result }: Props) {
  const initialEmail = useMemo(
    () => buildEmailFromAnalysis(result.analysis),
    [result.analysis]
  );
  const [emailText, setEmailText] = useState(initialEmail);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailDirty, setEmailDirty] = useState(false);
  const lastAnalysisRef = useRef(result.analysis);

  useEffect(() => {
    if (emailDirty || lastAnalysisRef.current === result.analysis) return;
    lastAnalysisRef.current = result.analysis;
    setEmailText(buildEmailFromAnalysis(result.analysis));
  }, [result.analysis, emailDirty]);

  const handleCopy = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Selecione o texto e use Ctrl+C.");
    }
  };

  const handleRestore = () => {
    const rebuilt = buildEmailFromAnalysis(result.analysis);
    setEmailText(rebuilt);
    setEmailDirty(false);
    setError(null);
  };

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-semibold text-slate-800">E-mail padrão</h2>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              Texto no formato do e-mail comercial. Os campos foram preenchidos
              automaticamente a partir do resumo — edite o que faltar (link do
              edital, valores, etc.) antes de copiar.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Copiado!" : "Copiar e-mail"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <textarea
          value={emailText}
          onChange={(event) => {
            setEmailText(event.target.value);
            setEmailDirty(true);
          }}
          spellCheck={false}
          className="w-full min-h-[420px] p-6 md:p-8 text-sm md:text-base leading-relaxed text-slate-800 font-mono bg-slate-50 border-0 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
          aria-label="Texto do e-mail padrão"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
