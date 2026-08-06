"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { DeleteProductButton, CloneProductButton } from "@/components/admin/DeleteProductButton";

export type ProductsTableItem = {
  id: string;
  name: string;
  price: number;
  viewCount: number;
  featured: boolean;
  destaque: boolean;
  active: boolean;
  categoryId: string;
  categoryLabel: string;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  imageCount: number;
  variants: { size: string; stock: number; minStock: number }[];
};

type StockFilter = "all" | "in_stock" | "out_of_stock" | "low_stock";
type DimsFilter = "all" | "with_dims" | "without_dims";
type PhotosFilter = "all" | "with_photos" | "without_photos";

type Props = {
  products: ProductsTableItem[];
  categories: { id: string; name: string; parentId: string | null }[];
};

function totalStock(p: ProductsTableItem) {
  return p.variants.reduce((sum, v) => sum + v.stock, 0);
}

function hasLowStock(p: ProductsTableItem) {
  return p.variants.some((v) => {
    const floor = v.minStock > 0 ? v.minStock : 3;
    return v.stock > 0 && v.stock <= floor;
  });
}

/** Peso + C + L + A preenchidos (> 0) — usados no Melhor Envio e Manda Bem. */
export function hasShippingDims(p: {
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
}) {
  return (
    p.weightKg != null &&
    p.weightKg > 0 &&
    p.lengthCm != null &&
    p.lengthCm > 0 &&
    p.widthCm != null &&
    p.widthCm > 0 &&
    p.heightCm != null &&
    p.heightCm > 0
  );
}

function dimsLabel(p: ProductsTableItem) {
  if (!hasShippingDims(p)) return null;
  return `${p.weightKg} kg · ${p.lengthCm}×${p.widthCm}×${p.heightCm} cm`;
}

export function ProductsTable({ products, categories }: Props) {
  const [nameQ, setNameQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [size, setSize] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [dimsFilter, setDimsFilter] = useState<DimsFilter>("all");
  const [photosFilter, setPhotosFilter] = useState<PhotosFilter>("all");

  const sizes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      for (const v of p.variants) {
        const s = v.size.trim();
        if (s) set.add(s);
      }
    }
    return [...set].sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true })
    );
  }, [products]);

  const categoryOptions = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    return categories
      .map((c) => {
        const parent = c.parentId ? byId.get(c.parentId) : null;
        return {
          id: c.id,
          label: parent ? `${parent.name} › ${c.name}` : c.name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
  }, [categories]);

  const missingDimsCount = useMemo(
    () => products.filter((p) => !hasShippingDims(p)).length,
    [products]
  );

  const missingPhotosCount = useMemo(
    () => products.filter((p) => (p.imageCount || 0) === 0).length,
    [products]
  );

  const filtered = useMemo(() => {
    const term = nameQ.trim().toLowerCase();
    return products.filter((p) => {
      if (term && !p.name.toLowerCase().includes(term)) return false;
      if (categoryId && p.categoryId !== categoryId) return false;
      if (size) {
        const hasSize = p.variants.some(
          (v) => v.size.trim().toLowerCase() === size.toLowerCase()
        );
        if (!hasSize) return false;
      }
      const stock = totalStock(p);
      if (stockFilter === "in_stock" && stock <= 0) return false;
      if (stockFilter === "out_of_stock" && stock > 0) return false;
      if (stockFilter === "low_stock" && !hasLowStock(p)) return false;
      const okDims = hasShippingDims(p);
      if (dimsFilter === "with_dims" && !okDims) return false;
      if (dimsFilter === "without_dims" && okDims) return false;
      const hasPhotos = (p.imageCount || 0) > 0;
      if (photosFilter === "with_photos" && !hasPhotos) return false;
      if (photosFilter === "without_photos" && hasPhotos) return false;
      return true;
    });
  }, [
    products,
    nameQ,
    categoryId,
    size,
    stockFilter,
    dimsFilter,
    photosFilter,
  ]);

  const hasFilters =
    nameQ.trim() !== "" ||
    categoryId !== "" ||
    size !== "" ||
    stockFilter !== "all" ||
    dimsFilter !== "all" ||
    photosFilter !== "all";

  function clearFilters() {
    setNameQ("");
    setCategoryId("");
    setSize("");
    setStockFilter("all");
    setDimsFilter("all");
    setPhotosFilter("all");
  }

  return (
    <div className="mt-8 space-y-3">
      <div className="border border-black/10 bg-white p-4 space-y-3">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-sm">Filtrar produtos</h2>
            <p className="text-xs text-muted mt-0.5">
              Busque por nome, categoria, tamanho, estoque, fotos ou dimensões
              de frete (Melhor Envio / Manda Bem).
            </p>
          </div>
          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-rose-dark underline-offset-2 hover:underline"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Nome
            </span>
            <input
              type="search"
              className="input"
              placeholder="Ex.: Conjunto Gabi"
              value={nameQ}
              onChange={(e) => setNameQ(e.target.value)}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Categoria
            </span>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Tamanho
            </span>
            <select
              className="input"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            >
              <option value="">Todos</option>
              {sizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Estoque
            </span>
            <select
              className="input"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            >
              <option value="all">Todos</option>
              <option value="in_stock">Com estoque</option>
              <option value="out_of_stock">Sem estoque</option>
              <option value="low_stock">Estoque baixo</option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Fotos
            </span>
            <select
              className="input"
              value={photosFilter}
              onChange={(e) => setPhotosFilter(e.target.value as PhotosFilter)}
            >
              <option value="all">Todas</option>
              <option value="with_photos">Com foto</option>
              <option value="without_photos">
                Sem foto
                {missingPhotosCount > 0 ? ` (${missingPhotosCount})` : ""}
              </option>
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-muted">
              Dimensões frete
            </span>
            <select
              className="input"
              value={dimsFilter}
              onChange={(e) => setDimsFilter(e.target.value as DimsFilter)}
            >
              <option value="all">Todas</option>
              <option value="with_dims">Cadastradas</option>
              <option value="without_dims">
                Sem cadastrar
                {missingDimsCount > 0 ? ` (${missingDimsCount})` : ""}
              </option>
            </select>
          </label>
        </div>

        <p className="text-xs text-muted">
          Mostrando{" "}
          <span className="tabular-nums font-medium text-[#2a2420]">
            {filtered.length}
          </span>{" "}
          de{" "}
          <span className="tabular-nums">{products.length}</span> produtos
          {missingPhotosCount > 0 && photosFilter === "all" ? (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                className="text-rose-dark underline-offset-2 hover:underline"
                onClick={() => setPhotosFilter("without_photos")}
              >
                {missingPhotosCount} sem foto
              </button>
            </>
          ) : null}
          {missingDimsCount > 0 && dimsFilter === "all" ? (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                className="text-rose-dark underline-offset-2 hover:underline"
                onClick={() => setDimsFilter("without_dims")}
              >
                {missingDimsCount} sem dimensões de frete
              </button>
            </>
          ) : null}
        </p>
      </div>

      <div className="admin-panel-card border border-black/10 bg-white overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Preço</th>
              <th>Variantes</th>
              <th>Estoque</th>
              <th>Frete</th>
              <th>Visitas</th>
              <th>Home</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const stock = totalStock(p);
              const okDims = hasShippingDims(p);
              const sizeHint =
                size &&
                p.variants
                  .filter(
                    (v) => v.size.trim().toLowerCase() === size.toLowerCase()
                  )
                  .reduce((sum, v) => sum + v.stock, 0);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.categoryLabel}</td>
                  <td>{formatBRL(p.price)}</td>
                  <td>{p.variants.length}</td>
                  <td>
                    <span className="tabular-nums" title="Soma das variantes">
                      {stock}
                    </span>
                    {typeof sizeHint === "number" ? (
                      <span className="block text-[10px] text-muted">
                        {size}: {sizeHint}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {okDims ? (
                      <span
                        className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-[#f0f7f1] text-[#3d6b45] border border-[#c5dbc9]"
                        title={dimsLabel(p) || undefined}
                      >
                        OK
                      </span>
                    ) : (
                      <span
                        className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-[#faf3f3] text-[#a85f64] border border-[#e8c9cb]"
                        title="Cadastre peso e dimensões no editar produto"
                      >
                        Falta
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="tabular-nums" title="Visitas na loja">
                      {p.viewCount.toLocaleString("pt-BR")}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {p.featured ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-[#fbf6eb] text-[#9a782f] border border-[#e8d9a8]">
                          Majesté
                        </span>
                      ) : null}
                      {p.destaque ? (
                        <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-[#faf3f3] text-[#a85f64] border border-[#e8c9cb]">
                          Destaques
                        </span>
                      ) : null}
                      {!p.featured && !p.destaque ? (
                        <span className="text-xs text-muted">—</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className="badge">
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-3 justify-end">
                      <Link
                        href={`/admin/produtos/${p.id}`}
                        className="text-sm text-rose-dark"
                      >
                        Editar
                      </Link>
                      <CloneProductButton
                        productId={p.id}
                        productName={p.name}
                      />
                      <DeleteProductButton
                        productId={p.id}
                        productName={p.name}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="text-sm text-muted py-8 text-center"
                >
                  Nenhum produto encontrado com esses filtros.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
