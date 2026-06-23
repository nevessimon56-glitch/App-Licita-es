"use client";

import { useCallback, useState } from "react";
import {
  FileText,
  Upload,
  X,
  Loader2,
  AlertCircle,
  Scale,
  ChevronDown,
} from "lucide-react";
import { AnalysisResult } from "./AnalysisResult";
import type { AnalysisResponse } from "@/lib/analysis-prompt";

export type DocumentType = "edital" | "termo_referencia" | "anexo" | "outro";

export interface FileEntry {
  id: string;
  file: File;
  type: DocumentType;
}

const TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "edital", label: "Edital" },
  { value: "termo_referencia", label: "Termo de Referência" },
  { value: "anexo", label: "Anexo técnico" },
  { value: "outro", label: "Outro" },
];

const LOADING_STEPS = [
  "Extraindo texto dos PDFs...",
  "Lendo edital e anexos...",
  "Identificando equipamentos e especificações...",
  "Analisando entrega, instalação e garantias...",
  "Verificando documentação e penalidades...",
  "Gerando resumo executivo (18 tópicos)...",
];

export function AnalyzerApp() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const pdfFiles = Array.from(incoming).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );

    if (!pdfFiles.length) {
      setError("Apenas arquivos PDF são aceitos.");
      return;
    }

    setError(null);
    setFiles((prev) => [
      ...prev,
      ...pdfFiles.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        type: inferDocumentType(file.name),
      })),
    ]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateType = (id: string, type: DocumentType) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, type } : f))
    );
  };

  const handleAnalyze = async () => {
    if (!files.length) {
      setError("Adicione pelo menos um PDF antes de analisar.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((s) => (s < LOADING_STEPS.length - 1 ? s + 1 : s));
    }, 8000);

    try {
      const formData = new FormData();
      files.forEach((entry) => {
        formData.append("files", entry.file);
        formData.append("types", entry.type);
      });

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Erro ao processar análise.");
      }

      setResult(data as AnalysisResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Scale className="w-8 h-8" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              App Licitações
            </h1>
          </div>
          <p className="text-blue-100 text-sm md:text-base max-w-3xl">
            Análise executiva completa de editais, Termos de Referência e anexos
            — 18 tópicos conforme a Lei nº 14.133/2021. Apenas informações
            presentes nos documentos, com referência de página e cláusula.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Upload section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-700" />
            Enviar documentos
          </h2>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
            }`}
          >
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600 mb-1">
              Arraste os PDFs aqui ou clique para selecionar
            </p>
            <p className="text-xs text-slate-400 mb-4">
              Edital, Termo de Referência, anexos técnicos e demais documentos
            </p>
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-white rounded-lg cursor-pointer hover:bg-blue-800 transition-colors text-sm font-medium">
              <Upload className="w-4 h-4" />
              Selecionar PDFs
              <input
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </label>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-slate-700">
                {files.length} arquivo(s) selecionado(s)
              </p>
              {files.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <span className="flex-1 text-sm text-slate-700 truncate">
                    {entry.file.name}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <div className="relative shrink-0">
                    <select
                      value={entry.type}
                      onChange={(e) =>
                        updateType(entry.id, e.target.value as DocumentType)
                      }
                      className="appearance-none text-xs border border-slate-300 rounded-md pl-2 pr-7 py-1.5 bg-white text-slate-700"
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={() => removeFile(entry.id)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    aria-label="Remover arquivo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading || !files.length}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-700 text-white rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Scale className="w-5 h-5" />
                  Analisar licitação
                </>
              )}
            </button>
          </div>

          {loading && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-medium animate-pulse-soft">
                {LOADING_STEPS[loadingStep]}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                A análise completa pode levar alguns minutos dependendo do
                tamanho dos documentos.
              </p>
            </div>
          )}
        </section>

        {/* Results */}
        {result && <AnalysisResult result={result} />}
      </main>

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-400">
        App Licitações — Análise baseada exclusivamente nos documentos
        enviados. Não substitui assessoria jurídica especializada.
      </footer>
    </div>
  );
}

function inferDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();
  if (lower.includes("edital")) return "edital";
  if (
    lower.includes("termo") &&
    (lower.includes("referencia") || lower.includes("referência"))
  )
    return "termo_referencia";
  if (lower.includes("anexo")) return "anexo";
  return "outro";
}
