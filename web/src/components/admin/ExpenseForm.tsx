"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ExpenseForm() {
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.get("description"),
        amount: Number(form.get("amount")),
        category: form.get("category"),
        dueDate: form.get("dueDate") || null,
        paid: form.get("paid") === "on",
      }),
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-5 border border-line bg-surface p-5">
      <input name="description" required placeholder="Despesa" className="input md:col-span-2" />
      <input name="amount" type="number" step="0.01" required placeholder="Valor" className="input" />
      <input name="category" required placeholder="Categoria" className="input" defaultValue="Operacional" />
      <input name="dueDate" type="date" className="input" />
      <label className="flex items-center gap-2 text-sm">
        <input name="paid" type="checkbox" /> Já paga
      </label>
      <button type="submit" className="btn btn-primary md:col-span-4">
        Registrar despesa
      </button>
    </form>
  );
}
