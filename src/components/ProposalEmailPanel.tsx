"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Mail, RotateCcw } from "lucide-react";
import {
  buildDefaultProposalEmailConfig,
  buildProposalEmail,
} from "@/lib/proposal-email-template";
import type { ProposalEmailConfig, ProposalPackage } from "@/lib/proposal-types";

interface Props {
  pkg: ProposalPackage;
  onEmailChange: (email: ProposalEmailConfig) => void;
}

export function ProposalEmailPanel({ pkg, onEmailChange }: Props) {
  const emailConfig = useMemo(
    () => pkg.email ?? buildDefaultProposalEmailConfig(pkg),
    [pkg]
  );

  const generated = useMemo(
    () => buildProposalEmail(pkg, emailConfig),
    [pkg, emailConfig]
  );

  const [subject, setSubject] = useState(generated.subject);
  const [body, setBody] = useState(generated.body);
  const [dirty, setDirty] = useState(false);
  const lastPkgRef = useRef(pkg);

  useEffect(() => {
    if (dirty && lastPkgRef.current === pkg) return;
    lastPkgRef.current = pkg;
    setSubject(generated.subject);
    setBody(generated.body);
  }, [generated.subject, generated.body, pkg, dirty]);

  const updateConfig = (patch: Partial<ProposalEmailConfig>) => {
    onEmailChange({ ...emailConfig, ...patch });
    setDirty(false);
  };

  const handleRestore = () => {
    const rebuilt = buildProposalEmail(pkg, emailConfig);
    setSubject(rebuilt.subject);
    setBody(rebuilt.body);
    setDirty(false);
  };

  const handleCopyAll = async () => {
    await navigator.clipboard.writeText(`${subject}\n\n${body}`);
  };

  const handleCopySubject = async () => {
    await navigator.clipboard.writeText(subject);
  };

  const handleCopyBody = async () => {
    await navigator.clipboard.writeText(body);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Mail className="w-5 h-5 text-blue-700" />
              <h3 className="text-lg font-semibold text-slate-800">
                E-mail padrão da proposta
              </h3>
            </div>
            <p className="text-sm text-slate-600 max-w-2xl">
              Montado com órgão, pregão, objeto, data, valores dos itens e
              condições que você editou na proposta. Ajuste os campos abaixo e
              copie o assunto e o corpo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar
            </button>
            <button
              type="button"
              onClick={handleCopySubject}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <Copy className="w-4 h-4" />
              Copiar assunto
            </button>
            <button
              type="button"
              onClick={handleCopyBody}
              className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <Copy className="w-4 h-4" />
              Copiar corpo
            </button>
            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg text-sm"
            >
              <Check className="w-4 h-4" />
              Copiar tudo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="proposal-field">
            <span>Resumo do órgão (assunto)</span>
            <input
              value={emailConfig.orgaoResumo}
              onChange={(e) => updateConfig({ orgaoResumo: e.target.value })}
              placeholder="Ex.: UNESP - SP ou EXERCITO - SP"
            />
          </label>
          <label className="proposal-field">
            <span>UASG / código Gov</span>
            <input
              value={emailConfig.uasg}
              onChange={(e) => updateConfig({ uasg: e.target.value })}
              placeholder="Ex.: 160456"
            />
          </label>
          <label className="proposal-field md:col-span-2">
            <span>Link do edital (Google Drive, etc.)</span>
            <input
              value={emailConfig.linkEdital}
              onChange={(e) => updateConfig({ linkEdital: e.target.value })}
              placeholder="https://drive.google.com/..."
            />
          </label>
          <label className="proposal-field">
            <span>Local de entrega</span>
            <input
              value={emailConfig.localEntrega}
              onChange={(e) => updateConfig({ localEntrega: e.target.value })}
              placeholder="Ex.: VÁRIOS SP E RJ"
            />
          </label>
          <label className="proposal-field">
            <span>Sufixo do pregão</span>
            <input
              value={emailConfig.sufixoPregao}
              onChange={(e) => updateConfig({ sufixoPregao: e.target.value })}
              placeholder="Ex.: REGISTRO DE PREÇOS"
            />
          </label>
          <label className="proposal-field md:col-span-2">
            <span>Texto de vigência</span>
            <textarea
              rows={2}
              value={emailConfig.textoVigencia}
              onChange={(e) => updateConfig({ textoVigencia: e.target.value })}
            />
          </label>
          <label className="proposal-field md:col-span-2">
            <span>Texto de habilitação contábil</span>
            <textarea
              rows={2}
              value={emailConfig.textoHabilitacao}
              onChange={(e) => updateConfig({ textoHabilitacao: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <label className="block px-5 pt-5 text-sm font-medium text-slate-700">
          Assunto
        </label>
        <input
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setDirty(true);
          }}
          className="w-full px-5 py-3 text-sm font-mono bg-slate-50 border-0 border-b border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <label className="block px-5 pt-4 text-sm font-medium text-slate-700">
          Corpo do e-mail
        </label>
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setDirty(true);
          }}
          spellCheck={false}
          className="w-full min-h-[520px] p-5 text-sm leading-relaxed text-slate-800 font-mono bg-slate-50 border-0 resize-y focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>
    </div>
  );
}
