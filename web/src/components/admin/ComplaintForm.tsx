"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ComplaintForm({
  customers,
  orders,
}: {
  customers: { id: string; name: string; email: string }[];
  orders: { id: string; orderNumber: string; customerId: string | null }[];
}) {
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.get("customerId"),
        orderId: form.get("orderId") || null,
        type: form.get("type"),
        subject: form.get("subject"),
        description: form.get("description"),
      }),
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 border border-line bg-surface p-5">
      <select name="customerId" required className="input">
        <option value="">Cliente</option>
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.email})
          </option>
        ))}
      </select>
      <select name="orderId" className="input">
        <option value="">Pedido (opcional)</option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.orderNumber}
          </option>
        ))}
      </select>
      <select name="type" className="input">
        <option value="EXCHANGE">Troca</option>
        <option value="RETURN">Devolução</option>
        <option value="DEFECT">Defeito</option>
        <option value="WRONG_ITEM">Item errado</option>
        <option value="OTHER">Outro</option>
      </select>
      <input name="subject" required placeholder="Assunto" className="input" />
      <textarea name="description" required placeholder="Descrição" className="input md:col-span-2 min-h-24" />
      <button type="submit" className="btn btn-primary md:col-span-2">
        Abrir reclamação
      </button>
    </form>
  );
}
