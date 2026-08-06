"use client";

import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/utils";

export type StockRow = {
  id: string;
  sku: string;
  size: string;
  color: string;
  stock: number;
  minStock: number;
  avgCost: number;
  productName: string;
  categoryName: string;
  categoryId: string;
};

type Props = {
  rows: StockRow[];
  categories: { id: string; name: string }[];
};

export function StockInventoryTable({ rows, categories }: Props) {
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (categoryId && r.categoryId !== categoryId) return false;
      if (!term) return true;
      return (
        r.productName.toLowerCase().includes(term) ||
        r.sku.toLowerCase().includes(term) ||
        r.color.toLowerCase().includes(term) ||
        r.size.toLowerCase().includes(term) ||
        r.categoryName.toLowerCase().includes(term)
      );
    });
  }, [rows, q, categoryId]);

  const stockValue = filtered.reduce(
    (sum, r) => sum + r.stock * r.avgCost,
    0
  );
  const units = filtered.reduce((sum, r) => sum + r.stock, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          className="input flex-1"
          placeholder="Buscar por nome, SKU, cor ou tamanho…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar produto no estoque"
        />
        <select
          className="input sm:w-56"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <p className="text-muted">
          {filtered.length} de {rows.length} variante(s)
          {q.trim() || categoryId ? " · filtro ativo" : ""}
        </p>
        <p className="font-medium">
          {units} un. · valor em estoque{" "}
          <span className="text-ink">{formatBRL(stockValue)}</span>
        </p>
      </div>

      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Var</th>
              <th>Estoque</th>
              <th>Custo médio</th>
              <th>Valor</th>
              <th>Mín</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                className={v.stock <= v.minStock ? "bg-rose/5" : ""}
              >
                <td>{v.sku}</td>
                <td>{v.productName}</td>
                <td className="text-muted text-sm">{v.categoryName}</td>
                <td>
                  {v.size} / {v.color}
                </td>
                <td>{v.stock}</td>
                <td>{formatBRL(v.avgCost)}</td>
                <td>{formatBRL(v.stock * v.avgCost)}</td>
                <td>{v.minStock}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-muted text-sm py-6">
                  Nenhum produto encontrado com essa busca.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
