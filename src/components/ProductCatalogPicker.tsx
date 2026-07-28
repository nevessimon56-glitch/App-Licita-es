"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, Package } from "lucide-react";
import type { ProposalItem } from "@/lib/proposal-types";
import { formatCurrencyBRL } from "@/lib/proposal-document";

interface BrandProduct {
  titulo_produto: string;
  marca_modelo: string;
  codigo: string;
  unidade: string;
  sample_count: number;
  avg_price: number | null;
  last_price: number | null;
  last_orgao: string | null;
}

interface PriceStats {
  sample_count: number;
  avg_price: number | null;
  min_price: number | null;
  max_price: number | null;
  last_price: number | null;
  last_orgao: string | null;
  last_pregao: string | null;
}

interface Props {
  item: ProposalItem;
  onApply: (patch: Partial<ProposalItem>) => void;
}

export function ProductCatalogPicker({ item, onApply }: Props) {
  const [brands, setBrands] = useState<string[]>([]);
  const [products, setProducts] = useState<BrandProduct[]>([]);
  const [stats, setStats] = useState<PriceStats | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(item.fabricante);

  const loadBrands = useCallback(async () => {
    setLoadingBrands(true);
    try {
      const response = await fetch("/api/products/brands");
      const data = (await response.json()) as { brands?: string[] };
      setBrands(data.brands ?? []);
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  const loadProducts = useCallback(async (fabricante: string) => {
    if (!fabricante.trim()) {
      setProducts([]);
      return;
    }

    setLoadingProducts(true);
    try {
      const response = await fetch(
        `/api/products/by-brand?fabricante=${encodeURIComponent(fabricante)}`
      );
      const data = (await response.json()) as { products?: BrandProduct[] };
      setProducts(data.products ?? []);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const loadStats = useCallback(async (fabricante: string, marcaModelo: string) => {
    if (!fabricante.trim() || !marcaModelo.trim()) {
      setStats(null);
      return;
    }

    setLoadingStats(true);
    try {
      const response = await fetch(
        `/api/products/price-stats?fabricante=${encodeURIComponent(fabricante)}&marcaModelo=${encodeURIComponent(marcaModelo)}`
      );
      const data = (await response.json()) as { stats?: PriceStats | null };
      setStats(data.stats ?? null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    setSelectedBrand(item.fabricante);
  }, [item.fabricante]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  useEffect(() => {
    if (selectedBrand) {
      void loadProducts(selectedBrand);
    }
  }, [selectedBrand, loadProducts]);

  useEffect(() => {
    if (item.fabricante && item.marcaModelo) {
      void loadStats(item.fabricante, item.marcaModelo);
    } else {
      setStats(null);
    }
  }, [item.fabricante, item.marcaModelo, loadStats]);

  function applyProduct(product: BrandProduct) {
    const patch: Partial<ProposalItem> = {
      fabricante: selectedBrand,
      marcaModelo: product.marca_modelo,
      codigo: product.codigo || item.codigo,
      unidade: product.unidade || item.unidade,
      tituloProduto: product.titulo_produto || item.tituloProduto,
    };

    if (product.last_price !== null) {
      patch.valorUnitario = product.last_price;
      patch.valorTotal = product.last_price * item.quantidade;
    }

    onApply(patch);
    void loadStats(selectedBrand, product.marca_modelo);
  }

  function applyAveragePrice() {
    if (!stats?.avg_price) return;
    onApply({
      valorUnitario: stats.avg_price,
      valorTotal: stats.avg_price * item.quantidade,
    });
  }

  function applyLastPrice() {
    if (!stats?.last_price) return;
    onApply({
      valorUnitario: stats.last_price,
      valorTotal: stats.last_price * item.quantidade,
    });
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-900">
        <Package className="w-4 h-4" />
        Catálogo inteligente — marcas e preços médios
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="proposal-field">
          <span>Marca / Fabricante salvo</span>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              onApply({ fabricante: e.target.value });
            }}
            disabled={loadingBrands}
          >
            <option value="">Selecione uma marca...</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>

        <label className="proposal-field">
          <span>Produto desta marca</span>
          <select
            disabled={!selectedBrand || loadingProducts}
            defaultValue=""
            onChange={(e) => {
              const product = products.find(
                (entry) => entry.marca_modelo === e.target.value
              );
              if (product) applyProduct(product);
              e.target.value = "";
            }}
          >
            <option value="">
              {loadingProducts ? "Carregando..." : "Escolher produto salvo..."}
            </option>
            {products.map((product) => (
              <option key={`${product.marca_modelo}-${product.titulo_produto}`} value={product.marca_modelo}>
                {product.marca_modelo}
                {product.avg_price !== null
                  ? ` — média ${formatCurrencyBRL(product.avg_price)}`
                  : ""}
                {product.sample_count > 0 ? ` (${product.sample_count}×)` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {(loadingStats || stats) && item.marcaModelo.trim() ? (
        <div className="rounded-lg bg-white border border-blue-100 p-3 text-sm space-y-2">
          <p className="flex items-center gap-2 font-medium text-slate-800">
            <BarChart3 className="w-4 h-4 text-blue-700" />
            {item.marcaModelo}
            {loadingStats ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
            ) : null}
          </p>

          {stats ? (
            <>
              <p className="text-slate-600">
                <strong>Preço médio:</strong> {formatCurrencyBRL(stats.avg_price)}{" "}
                <span className="text-slate-500">
                  ({stats.sample_count} registro{stats.sample_count === 1 ? "" : "s"})
                </span>
              </p>
              {stats.min_price !== null && stats.max_price !== null ? (
                <p className="text-slate-500 text-xs">
                  Faixa: {formatCurrencyBRL(stats.min_price)} —{" "}
                  {formatCurrencyBRL(stats.max_price)}
                </p>
              ) : null}
              {stats.last_price !== null ? (
                <p className="text-slate-500 text-xs">
                  Último: {formatCurrencyBRL(stats.last_price)}
                  {stats.last_orgao ? ` — ${stats.last_orgao}` : ""}
                  {stats.last_pregao ? ` PE ${stats.last_pregao}` : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={applyAveragePrice}
                  disabled={!stats.avg_price}
                  className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50"
                >
                  Usar média
                </button>
                <button
                  type="button"
                  onClick={applyLastPrice}
                  disabled={!stats.last_price}
                  className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-800 text-xs font-medium hover:bg-blue-50 disabled:opacity-50"
                >
                  Usar último
                </button>
              </div>
            </>
          ) : !loadingStats ? (
            <p className="text-slate-500 text-xs">
              Sem histórico de preço para este modelo ainda. Salve uma proposta com
              preço para começar a calcular a média.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
