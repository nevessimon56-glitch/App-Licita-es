"use client";

import type { ProposalItem } from "@/lib/proposal-types";
import { formatCurrencyBRL } from "@/lib/proposal-document";
import { buildMarcaModeloParts } from "@/lib/proposal-layout";
import { PROPOSAL_SEM_INSTALACAO_SUFFIX } from "@/lib/proposal-export-styles";
import { applyCatalogToItems } from "@/lib/history-client";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface Props {
  itens: ProposalItem[];
  onChange: (itens: ProposalItem[]) => void;
  supabaseEnabled?: boolean;
}

export function ProposalItemsEditor({
  itens,
  onChange,
  supabaseEnabled = false,
}: Props) {
  const [applyingCatalog, setApplyingCatalog] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);

  const updateItem = (index: number, patch: Partial<ProposalItem>) => {
    onChange(
      itens.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        if (patch.valorUnitario !== undefined || patch.quantidade !== undefined) {
          const unit = patch.valorUnitario ?? next.valorUnitario;
          next.valorTotal =
            unit !== null && Number.isFinite(unit)
              ? (patch.quantidade ?? next.quantidade) * unit
              : null;
        }
        return next;
      })
    );
  };

  const addItem = () => {
    onChange([
      ...itens,
      {
        numero: String(itens.length + 1),
        unidade: "UND",
        codigo: "",
        tituloProduto: "",
        descricao: "",
        descricaoComplementar: "",
        quantidade: 1,
        fabricante: "",
        marcaModelo: "",
        semInstalacao: true,
        valorUnitario: null,
        valorTotal: null,
      },
    ]);
  };

  const removeItem = (index: number) => {
    onChange(itens.filter((_, i) => i !== index));
  };

  async function handleApplyCatalog() {
    if (!supabaseEnabled || !itens.length) return;

    setApplyingCatalog(true);
    setCatalogMessage(null);

    try {
      const { itens: updated } = await applyCatalogToItems(itens);
      const filledCount = updated.filter((item, index) => {
        const prev = itens[index];
        return (
          item.fabricante !== prev.fabricante ||
          item.marcaModelo !== prev.marcaModelo ||
          item.valorUnitario !== prev.valorUnitario
        );
      }).length;

      onChange(updated);
      setCatalogMessage(
        filledCount > 0
          ? `Catálogo aplicado em ${filledCount} item(ns).`
          : "Nenhum item encontrado no catálogo ainda."
      );
    } catch (err) {
      setCatalogMessage(
        err instanceof Error ? err.message : "Erro ao aplicar catálogo."
      );
    } finally {
      setApplyingCatalog(false);
    }
  }

  if (!itens.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        Nenhum item extraído. Adicione manualmente ou regenere a proposta.
        <div className="mt-4">
          <button
            type="button"
            onClick={addItem}
            className="text-blue-700 font-medium hover:underline"
          >
            Adicionar item
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {supabaseEnabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Preencha fabricante, marca e preço com base no que você já cadastrou
            em propostas anteriores.
          </p>
          <button
            type="button"
            onClick={() => void handleApplyCatalog()}
            disabled={applyingCatalog}
            className="inline-flex items-center gap-2 px-3 py-2 border border-blue-200 bg-blue-50 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
          >
            {applyingCatalog ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Preencher do catálogo
          </button>
        </div>
      ) : null}

      {catalogMessage ? (
        <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          {catalogMessage}
        </p>
      ) : null}

      {itens.map((item, index) => (
        <div
          key={`${item.numero}-${index}`}
          className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-800">
              Item {item.numero}
              {item.tituloProduto ? ` — ${item.tituloProduto}` : ""}
            </h3>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-sm text-red-600 hover:underline"
            >
              Remover
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="proposal-field">
              <span>Nº item</span>
              <input
                value={item.numero}
                onChange={(e) => updateItem(index, { numero: e.target.value })}
              />
            </label>
            <label className="proposal-field">
              <span>Unidade</span>
              <input
                value={item.unidade}
                onChange={(e) => updateItem(index, { unidade: e.target.value })}
              />
            </label>
            <label className="proposal-field">
              <span>Código</span>
              <input
                value={item.codigo}
                onChange={(e) => updateItem(index, { codigo: e.target.value })}
              />
            </label>
            <label className="proposal-field">
              <span>Quantidade</span>
              <input
                type="number"
                min={1}
                value={item.quantidade}
                onChange={(e) =>
                  updateItem(index, { quantidade: Number(e.target.value) || 1 })
                }
              />
            </label>
          </div>

          <label className="proposal-field">
            <span>Título do produto (editável)</span>
            <input
              value={item.tituloProduto}
              onChange={(e) => updateItem(index, { tituloProduto: e.target.value })}
              placeholder="Ex.: AR-CONDICIONADO SPLIT 12.000 BTUS"
            />
          </label>

          <label className="proposal-field">
            <span>Descrição técnica (maiúsculas, texto corrido)</span>
            <textarea
              value={item.descricao}
              onChange={(e) =>
                updateItem(index, { descricao: e.target.value.toUpperCase() })
              }
              rows={6}
              className="font-mono text-xs"
            />
          </label>

          <label className="proposal-field">
            <span>Informações complementares (outras páginas do edital)</span>
            <textarea
              value={item.descricaoComplementar}
              onChange={(e) =>
                updateItem(index, {
                  descricaoComplementar: e.target.value.toUpperCase(),
                })
              }
              rows={3}
              className="font-mono text-xs"
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="proposal-field">
              <span>Fabricante</span>
              <input
                value={item.fabricante}
                onChange={(e) => updateItem(index, { fabricante: e.target.value })}
              />
            </label>
            <label className="proposal-field">
              <span>Marca / Modelo</span>
              <input
                value={item.marcaModelo}
                onChange={(e) => updateItem(index, { marcaModelo: e.target.value })}
              />
            </label>
            <label className="proposal-field">
              <span>Valor unitário (R$)</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={item.valorUnitario ?? ""}
                onChange={(e) =>
                  updateItem(index, {
                    valorUnitario: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <label className="proposal-field">
              <span>Valor total</span>
              <input
                readOnly
                value={formatCurrencyBRL(item.valorTotal)}
                className="bg-slate-100"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={item.semInstalacao}
              onChange={(e) => updateItem(index, { semInstalacao: e.target.checked })}
            />
            Incluir &quot;- SEM INSTALAÇÃO.&quot; na proposta
          </label>
          {item.semInstalacao && (
            <p className="text-sm text-slate-700">
              Prévia na proposta:{" "}
              <span>{buildMarcaModeloParts(item).base}</span>
              <span className="font-semibold text-red-600">
                {PROPOSAL_SEM_INSTALACAO_SUFFIX}
              </span>
            </p>
          )}
        </div>
      ))}

      <button type="button" onClick={addItem} className="doc-edit-add-row">
        + Adicionar item
      </button>
    </div>
  );
}
