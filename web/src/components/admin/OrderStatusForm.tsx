"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = [
  "PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
];

export function OrderStatusForm({
  orderId,
  status,
  trackingCode,
}: {
  orderId: string;
  status: string;
  trackingCode: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        trackingCode: form.get("trackingCode"),
      }),
    });
    setMsg(res.ok ? "Atualizado" : "Erro");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-3 items-end border border-line bg-surface p-4">
      <label className="text-sm">
        Status
        <select name="status" defaultValue={status} className="input mt-1">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm flex-1 min-w-[180px]">
        Rastreio
        <input
          name="trackingCode"
          defaultValue={trackingCode}
          className="input mt-1"
          placeholder="Código de rastreio"
        />
      </label>
      <button type="submit" className="btn btn-primary">
        Salvar
      </button>
      {msg && <span className="text-sm text-muted">{msg}</span>}
    </form>
  );
}
