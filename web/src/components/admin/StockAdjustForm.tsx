"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type VariantOption = {
  id: string;
  label: string;
  productName: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  avgCost: number;
};

export function StockAdjustForm({
  variants,
  categories,
}: {
  variants: VariantOption[];
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [variantId, setVariantId] = useState(variants[0]?.id || "");
  const [type, setType] = useState("IN");
  const [unitCost, setUnitCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [registerExpense, setRegisterExpense] = useState(true);
  const [paid, setPaid] = useState(true);
  const [busy, setBusy] = useState(false);

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
  const effectiveVariantId = selectedOk ? variantId : filtered[0]?.id || "";
  const selected = variants.find((v) => v.id === effectiveVariantId);
  const needsCost = type === "IN";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!effectiveVariantId) {
      setMsg("Selecione um produto");
      return;
    }
    if (needsCost && (!unitCost || Number(unitCost) <= 0)) {
      setMsg("Informe o custo unitário da compra");
      return;
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: effectiveVariantId,
        type,
        quantity: Number(form.get("quantity")),
        note: form.get("note"),
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
    if (needsCost) setUnitCost("");
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 md:grid-cols-4 border border-line bg-surface p-5"
    >
      <div className="md:col-span-4">
        <h2 className="font-semibold text-sm mb-1">Movimentar estoque</h2>
        <p className="text-xs text-muted">
          Em <strong>Entrada</strong>, informe data da compra e custo unitário —
          o sistema calcula o <strong>custo médio</strong> e lança no financeiro.
        </p>
      </div>

      <div className="md:col-span-4 grid gap-3 sm:grid-cols-2">
        <input
          type="search"
          className="input"
          placeholder="Buscar produto por nome ou SKU…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar variante para movimentar"
        />
        <select
          className="input"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <select
        name="variantId"
        required
        className="input md:col-span-2"
        value={effectiveVariantId}
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
      <select
        name="type"
        className="input"
        value={type}
        onChange={(e) => setType(e.target.value)}
      >
        <option value="IN">Entrada (compra)</option>
        <option value="OUT">Saída</option>
        <option value="ADJUSTMENT">Ajuste (definir qtd)</option>
        <option value="RETURN">Devolução</option>
      </select>
      <input
        name="quantity"
        type="number"
        required
        min={1}
        placeholder="Quantidade"
        className="input"
      />

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
        name="note"
        placeholder="Observação / NF"
        className="input md:col-span-3"
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!effectiveVariantId || busy}
      >
        {busy ? "Salvando…" : "Registrar"}
      </button>
      {msg ? <p className="text-sm text-muted md:col-span-4">{msg}</p> : null}
    </form>
  );
}
