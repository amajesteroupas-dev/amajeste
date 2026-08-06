"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/utils";
import type { StockRow } from "@/components/admin/StockInventoryTable";

type VariantOption = {
  id: string;
  label: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  avgCost: number;
  stock: number;
  minStock: number;
};

type Props = {
  variants: VariantOption[];
  categories: { id: string; name: string }[];
  rows: StockRow[];
};

export function StockManager({ variants, categories, rows }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [variantId, setVariantId] = useState(variants[0]?.id || "");
  const [type, setType] = useState("IN");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [minStock, setMinStock] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [registerExpense, setRegisterExpense] = useState(true);
  const [paid, setPaid] = useState(true);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return variants.filter((v) => {
      if (categoryId && v.categoryId !== categoryId) return false;
      if (!term) return true;
      return (
        v.productName.toLowerCase().includes(term) ||
        v.label.toLowerCase().includes(term) ||
        v.sku.toLowerCase().includes(term) ||
        v.categoryName.toLowerCase().includes(term)
      );
    });
  }, [variants, q, categoryId]);

  const selectedOk = filtered.some((v) => v.id === variantId);
  const effectiveVariantId = selectedOk
    ? variantId
    : filtered[0]?.id || "";
  const selected = variants.find((v) => v.id === effectiveVariantId);
  const isEditing = Boolean(editingId);
  const needsCost = type === "IN" && !isEditing;

  useEffect(() => {
    if (!editingId) return;
    const el = formRef.current;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingId]);

  function resetEdit() {
    setEditingId(null);
    setType("IN");
    setQuantity("");
    setUnitCost("");
    setMinStock("");
    setNote("");
    setMsg("");
  }

  function startEdit(row: StockRow) {
    setEditingId(row.id);
    setVariantId(row.id);
    setCategoryId(row.categoryId);
    setQ(row.productName);
    setType("ADJUSTMENT");
    setQuantity(String(row.stock));
    setUnitCost(row.avgCost > 0 ? String(row.avgCost) : "");
    setMinStock(String(row.minStock));
    setNote("");
    setMsg(`Editando ${row.sku} — ${row.productName}`);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!effectiveVariantId) {
      setMsg("Selecione um produto");
      return;
    }

    setBusy(true);

    if (isEditing) {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: editingId,
          stock: Number(quantity),
          avgCost: unitCost !== "" ? Number(unitCost) : undefined,
          minStock: minStock !== "" ? Number(minStock) : undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setBusy(false);
      if (!res.ok) {
        setMsg(data.error || "Erro ao salvar edição");
        return;
      }
      setMsg(
        `Estoque atualizado · ${data.stock} un. · custo médio ${formatBRL(Number(data.avgCost || 0))}`
      );
      resetEdit();
      router.refresh();
      return;
    }

    if (needsCost && (!unitCost || Number(unitCost) <= 0)) {
      setBusy(false);
      setMsg("Informe o custo unitário da compra");
      return;
    }

    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: effectiveVariantId,
        type,
        quantity: Number(quantity),
        note: note || undefined,
        unitCost: needsCost || unitCost ? Number(unitCost) : undefined,
        purchaseDate: needsCost || purchaseDate ? purchaseDate : undefined,
        registerExpense: needsCost ? registerExpense : false,
        paid: needsCost ? paid : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Erro ao registrar");
      return;
    }
    setMsg(
      data.avgCost != null
        ? `OK · estoque ${data.stock} · custo médio R$ ${Number(data.avgCost).toFixed(2)}`
        : "Movimentação registrada"
    );
    setQuantity("");
    if (needsCost) setUnitCost("");
    setNote("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`grid gap-3 md:grid-cols-4 border p-5 ${
          isEditing
            ? "border-[var(--rose)] bg-[#fff8f7]"
            : "border-line bg-surface"
        }`}
      >
        <div className="md:col-span-4">
          <h2 className="font-semibold text-sm mb-1">
            {isEditing ? "Editar estoque" : "Movimentar estoque"}
          </h2>
          <p className="text-xs text-muted">
            {isEditing
              ? "Altere a quantidade, o custo médio e o estoque mínimo. Depois clique em Salvar alterações."
              : "Em Entrada, informe data da compra e custo unitário — o sistema calcula o custo médio e lança no financeiro."}
          </p>
        </div>

        {!isEditing ? (
          <div className="md:col-span-4 grid gap-3 sm:grid-cols-2">
            <input
              type="search"
              className="input"
              placeholder="Buscar produto por nome ou SKU…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <select
          required
          className="input md:col-span-2"
          value={effectiveVariantId}
          disabled={isEditing}
          onChange={(e) => {
            setVariantId(e.target.value);
            const v = variants.find((x) => x.id === e.target.value);
            if (v && v.avgCost > 0 && !unitCost) {
              setUnitCost(String(v.avgCost));
            }
          }}
        >
          {filtered.length === 0 ? (
            <option value="">Nenhum produto nesta busca</option>
          ) : (
            filtered.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))
          )}
        </select>

        {!isEditing ? (
          <select
            className="input"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="IN">Entrada (compra)</option>
            <option value="OUT">Saída</option>
            <option value="ADJUSTMENT">Ajuste (definir qtd)</option>
            <option value="RETURN">Devolução</option>
          </select>
        ) : (
          <div className="input flex items-center text-sm text-muted bg-white/60">
            Edição manual
          </div>
        )}

        <input
          type="number"
          required
          min={isEditing || type === "ADJUSTMENT" ? 0 : 1}
          placeholder={isEditing ? "Estoque atual" : "Quantidade"}
          className="input"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />

        {isEditing ? (
          <>
            <label className="block text-xs text-muted md:col-span-2">
              Custo médio (R$)
              <input
                type="number"
                step="0.01"
                min="0"
                className="input mt-1 w-full"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder="Ex: 45.00"
              />
            </label>
            <label className="block text-xs text-muted md:col-span-2">
              Estoque mínimo
              <input
                type="number"
                min="0"
                className="input mt-1 w-full"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {needsCost ? (
          <>
            <label className="block text-xs text-muted md:col-span-2">
              Data da compra
              <input
                type="date"
                className="input mt-1 w-full"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </label>
            <label className="block text-xs text-muted md:col-span-2">
              Custo unitário (R$)
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input mt-1 w-full"
                placeholder={
                  selected?.avgCost
                    ? `Médio atual: ${selected.avgCost.toFixed(2)}`
                    : "Ex: 45.00"
                }
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={registerExpense}
                onChange={(e) => setRegisterExpense(e.target.checked)}
              />
              Lançar no financeiro (compra de mercadoria)
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                disabled={!registerExpense}
              />
              Compra já paga (sai do caixa)
            </label>
          </>
        ) : null}

        <input
          placeholder="Observação / NF"
          className="input md:col-span-3"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!effectiveVariantId || busy}
          >
            {busy
              ? "Salvando…"
              : isEditing
                ? "Salvar alterações"
                : "Registrar"}
          </button>
          {isEditing ? (
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={resetEdit}
            >
              Cancelar
            </button>
          ) : null}
        </div>
        {msg ? <p className="text-sm text-muted md:col-span-4">{msg}</p> : null}
      </form>

      <StockTable
        rows={rows}
        categories={categories}
        editingId={editingId}
        onEdit={startEdit}
      />
    </div>
  );
}

function StockTable({
  rows,
  categories,
  editingId,
  onEdit,
}: {
  rows: StockRow[];
  categories: { id: string; name: string }[];
  editingId: string | null;
  onEdit: (row: StockRow) => void;
}) {
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
        />
        <select
          className="input sm:w-56"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
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
              <th className="w-[1%] whitespace-nowrap">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr
                key={v.id}
                className={
                  editingId === v.id
                    ? "bg-[#fff0ee]"
                    : v.stock <= v.minStock
                      ? "bg-rose/5"
                      : ""
                }
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
                <td>
                  <button
                    type="button"
                    className="btn btn-outline !py-1 !px-2 text-xs"
                    onClick={() => onEdit(v)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-muted text-sm py-6">
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
