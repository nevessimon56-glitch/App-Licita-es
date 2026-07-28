"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import {
  formatAuditValue,
  isProposalItemDetail,
  type AuditProposalItemDetail,
} from "@/lib/admin-audit-details";
import { formatCurrencyBRL } from "@/lib/proposal-layout";

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

const ACTION_LABELS: Record<string, string> = {
  analysis_saved: "Análise salva",
  proposal_saved: "Proposta salva",
  proposal_updated: "Proposta atualizada",
  item_field_edited: "Item editado",
};

const FIELD_LABELS: Record<string, string> = {
  titulo: "Título",
  orgao: "Órgão",
  objeto: "Objeto",
  numero_pregao: "Pregão",
  processo: "Processo",
  modalidade: "Modalidade",
  tipo_pregao: "Tipo de pregão",
  analysis_mode: "Modo da análise",
  document_count: "Qtd. documentos",
  documentos: "Documentos",
  company_id: "Empresa",
  items_count: "Qtd. itens",
  grand_total: "Total (número)",
  grand_total_fmt: "Total",
  item_numero: "Item",
  item_titulo: "Produto",
  field: "Campo",
  de: "Valor anterior",
  para: "Valor novo",
};

interface Props {
  entry: AuditEntry;
}

export function AdminAuditEntryCard({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);
  const changes = entry.changes ?? {};
  const itens = Array.isArray(changes.itens)
    ? changes.itens.filter(isProposalItemDetail)
    : [];
  const documentos = Array.isArray(changes.documentos)
    ? changes.documentos.map(String)
    : [];

  const detailFields = Object.entries(changes).filter(
    ([key, value]) =>
      key !== "itens" &&
      key !== "documentos" &&
      key !== "grand_total" &&
      value !== "" &&
      value !== null &&
      value !== undefined
  );

  const hasDetails =
    detailFields.length > 0 ||
    itens.length > 0 ||
    documentos.length > 0 ||
    entry.action === "item_field_edited";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800">
            {entry.summary || ACTION_LABELS[entry.action] || entry.action}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            <span className="font-medium">{entry.user_email || "Usuário"}</span>
            {entry.folder_title ? ` — pasta: ${entry.folder_title}` : ""}
          </p>

          {entry.action === "item_field_edited" ? (
            <p className="text-sm text-slate-600 mt-2">
              <strong>{formatAuditValue(changes.item_numero)}</strong>
              {changes.item_titulo ? ` — ${String(changes.item_titulo)}` : ""}
              <br />
              <span className="text-slate-500">{String(changes.field || "Campo")}: </span>
              <span className="line-through">{formatAuditValue(changes.de)}</span>
              {" → "}
              <span className="font-medium text-slate-800">
                {formatAuditValue(changes.para)}
              </span>
            </p>
          ) : null}

          {!expanded && changes.grand_total_fmt ? (
            <p className="text-sm text-emerald-700 mt-2 font-medium">
              Total: {String(changes.grand_total_fmt)}
              {typeof changes.items_count === "number"
                ? ` · ${changes.items_count} item(ns)`
                : ""}
            </p>
          ) : null}

          {!expanded && changes.orgao ? (
            <p className="text-xs text-slate-500 mt-1">
              {String(changes.orgao)}
              {changes.numero_pregao ? ` · PE ${String(changes.numero_pregao)}` : ""}
            </p>
          ) : null}
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-slate-500">
            {new Date(entry.created_at).toLocaleString("pt-BR")}
          </p>
          {entry.entity_id ? (
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              {entry.entity_id.slice(0, 8)}…
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
        <p className="text-xs text-slate-500 inline-flex items-center gap-1">
          <FolderOpen className="w-3 h-3" />
          {ACTION_LABELS[entry.action] ?? entry.action}
        </p>

        {hasDetails ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1 text-xs text-blue-700 hover:underline"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ocultar detalhes
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ver detalhes
              </>
            )}
          </button>
        ) : (
          <span className="text-[10px] text-slate-400">
            Registro antigo — sem detalhes extras
          </span>
        )}
      </div>

      {expanded && hasDetails ? (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
          {detailFields.length ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {detailFields.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-slate-500 text-xs">
                    {FIELD_LABELS[key] ?? key}
                  </dt>
                  <dd className="text-slate-800 break-words">
                    {formatAuditValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          {documentos.length ? (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">
                Documentos analisados
              </p>
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                {documentos.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {itens.length ? (
            <div className="overflow-x-auto">
              <p className="text-xs font-medium text-slate-600 mb-2">
                Itens da proposta ({itens.length})
              </p>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-2 py-2">Item</th>
                    <th className="text-left px-2 py-2">Produto</th>
                    <th className="text-left px-2 py-2">Fabricante</th>
                    <th className="text-left px-2 py-2">Marca/Modelo</th>
                    <th className="text-right px-2 py-2">Qtd</th>
                    <th className="text-right px-2 py-2">Unit.</th>
                    <th className="text-right px-2 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item: AuditProposalItemDetail) => (
                    <tr key={`${item.numero}-${item.titulo}`} className="border-t">
                      <td className="px-2 py-2">{item.numero}</td>
                      <td className="px-2 py-2 max-w-[200px]">{item.titulo || "—"}</td>
                      <td className="px-2 py-2">{item.fabricante || "—"}</td>
                      <td className="px-2 py-2">{item.marca_modelo || "—"}</td>
                      <td className="px-2 py-2 text-right">
                        {item.quantidade} {item.unidade}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {formatCurrencyBRL(item.valor_unitario)}
                      </td>
                      <td className="px-2 py-2 text-right font-medium">
                        {formatCurrencyBRL(item.valor_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
