"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function StockAdjustForm({
  variants,
}: {
  variants: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: form.get("variantId"),
        type: form.get("type"),
        quantity: Number(form.get("quantity")),
        note: form.get("note"),
      }),
    });
    setMsg(res.ok ? "Movimentação registrada" : "Erro");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-4 border border-line bg-surface p-5">
      <select name="variantId" required className="input md:col-span-2">
        {variants.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <select name="type" className="input">
        <option value="IN">Entrada</option>
        <option value="OUT">Saída</option>
        <option value="ADJUSTMENT">Ajuste</option>
        <option value="RETURN">Devolução</option>
      </select>
      <input name="quantity" type="number" required placeholder="Quantidade" className="input" />
      <input name="note" placeholder="Observação" className="input md:col-span-3" />
      <button type="submit" className="btn btn-primary">
        Registrar
      </button>
      {msg && <p className="text-sm text-muted md:col-span-4">{msg}</p>}
    </form>
  );
}
