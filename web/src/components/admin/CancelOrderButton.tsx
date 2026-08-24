"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  orderId: string;
  orderNumber: string;
  /** compact = link/botão pequeno na lista */
  compact?: boolean;
};

export function CancelOrderButton({
  orderId,
  orderNumber,
  compact = false,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onCancel() {
    const ok = window.confirm(
      `Cancelar o pedido ${orderNumber}?\n\nAs peças voltam ao estoque e o valor é estornado no caixa.`
    );
    if (!ok) return;

    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          notifyCustomer: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error || "Não foi possível cancelar");
        return;
      }
      const units = Number(data.stockReturned || 0);
      const cash = Number(data.cashReversed || 0);
      const stockMsg =
        units > 0
          ? `${units} peça(s) devolvida(s) ao estoque`
          : "estoque liberado";
      const cashMsg =
        cash > 0
          ? ` · R$ ${cash.toFixed(2).replace(".", ",")} estornado no caixa`
          : "";
      setMsg(`Cancelado · ${stockMsg}${cashMsg}`);
      router.refresh();
    } catch {
      setMsg("Falha de rede ao cancelar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className={compact ? "inline-flex flex-col items-start gap-0.5" : "inline-flex flex-col gap-1"}>
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className={
          compact
            ? "text-xs underline text-rose-dark hover:text-ink disabled:opacity-50"
            : "btn btn-outline border-[var(--rose)] text-[var(--rose-dark)] hover:bg-[var(--rose)] hover:text-white disabled:opacity-50"
        }
      >
        {loading ? "Cancelando…" : "Cancelar pedido"}
      </button>
      {msg ? (
        <span className="text-xs text-emerald-800 max-w-[14rem]">{msg}</span>
      ) : null}
    </span>
  );
}
