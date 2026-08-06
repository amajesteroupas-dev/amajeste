"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { customerWhatsAppUrl } from "@/lib/site";
import { orderStatusLabel } from "@/lib/order-labels";

type MeOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  city: string | null;
  state: string | null;
  shippingMethod: string | null;
  shippingServiceId?: string | null;
  shippingCost: number;
  paymentStatus?: string;
  labelStatus: string;
  labelUrl: string | null;
  trackingCode: string | null;
  melhorEnvioId: string | null;
  provider?: "local" | "melhor_envio" | "manda_bem" | "unknown";
};

const STATUS_UI: Record<string, { label: string; className: string }> = {
  ready: { label: "Pronto p/ envio", className: "bg-emerald-50 text-emerald-800" },
  generated: { label: "Etiqueta / rastreio", className: "bg-sky-50 text-sky-800" },
  local: { label: "Entrega local", className: "bg-amber-50 text-amber-900" },
  pending_pay: { label: "Aguardando pagamento", className: "bg-stone-100 text-stone-600" },
  no_service: { label: "Sem serviço", className: "bg-rose-50 text-rose-800" },
  manda_bem: { label: "Manda Bem", className: "bg-violet-50 text-violet-900" },
};

type Filter = "all" | "local" | "correios";

/** Lista de pedidos no estilo Melhor Envio — usada no painel Manda Bem. */
export function ShippingOrdersPanel({
  mode = "manda_bem",
}: {
  mode?: "manda_bem" | "melhor_envio";
}) {
  const [orders, setOrders] = useState<MeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  async function loadOrders() {
    setLoading(true);
    const res = await fetch("/api/admin/melhor-envio/orders");
    const data = await res.json();
    setLoading(false);
    if (res.ok) setOrders(data.items || []);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const withProvider = orders.map((o) => {
    const sid = o.shippingServiceId || "";
    let provider: MeOrder["provider"] = o.provider;
    if (!provider) {
      if (o.labelStatus === "local") provider = "local";
      else if (sid.startsWith("mb-")) provider = "manda_bem";
      else if (/^\d+$/.test(sid)) provider = "melhor_envio";
      else provider = "unknown";
    }
    return { ...o, provider };
  });

  const localOrders = withProvider.filter((o) => o.provider === "local");
  const correiosOrders = withProvider.filter((o) => o.provider !== "local");
  const showLocal = filter === "all" || filter === "local";
  const showCorreios = filter === "all" || filter === "correios";

  function renderRows(list: MeOrder[]) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted py-4 text-center">
          Nenhum pedido nesta lista
        </p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-black/10">
              <th className="py-2 pr-2">Pedido</th>
              <th className="py-2 pr-2">Cliente</th>
              <th className="py-2 pr-2">Frete</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const uiKey =
                o.provider === "manda_bem"
                  ? "manda_bem"
                  : o.labelStatus;
              const st = STATUS_UI[uiKey] || STATUS_UI.pending_pay;
              const wa =
                o.provider === "local"
                  ? customerWhatsAppUrl(
                      o.customerPhone,
                      `Olá! Entramos em contato sobre o pedido ${o.orderNumber} da Majesté (entrega local Planaltina / Sobradinho).`
                    )
                  : customerWhatsAppUrl(
                      o.customerPhone,
                      `Olá! Sobre o pedido ${o.orderNumber} da Majesté.`
                    );
              return (
                <tr key={o.id} className="border-b border-black/5 align-top">
                  <td className="py-2.5 pr-2">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="block text-[11px] text-muted">
                      {formatDateTimeBR(o.createdAt, { seconds: true })}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    {o.customerName || "—"}
                    <span className="block text-[11px] text-muted">
                      {[o.city, o.state].filter(Boolean).join("/")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <span className="block">{o.shippingMethod || "—"}</span>
                    <span className="text-[11px] text-muted">
                      {o.provider === "local"
                        ? "A combinar"
                        : formatBRL(o.shippingCost)}
                      {o.provider === "manda_bem" ? " · Manda Bem" : null}
                      {o.provider === "melhor_envio" ? " · Melhor Envio" : null}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 ${st.className}`}
                    >
                      {st.label}
                    </span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td className="py-2.5 space-y-1">
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] underline text-emerald-800"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {mode === "manda_bem" && o.provider === "manda_bem" ? (
                      <a
                        href="https://mandabem.com.br/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] underline text-violet-800"
                      >
                        Abrir Manda Bem
                      </a>
                    ) : null}
                    {o.trackingCode ? (
                      <a
                        href={`/rastreio?codigo=${encodeURIComponent(o.trackingCode)}&pedido=${encodeURIComponent(o.orderNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] underline text-muted"
                      >
                        Rastrear
                      </a>
                    ) : null}
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="block text-[11px] underline text-muted"
                    >
                      Detalhe
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="border border-black/10 bg-white p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium text-[#2a2420]">Meus pedidos</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="input !py-1.5 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
          >
            <option value="all">Todos</option>
            <option value="local">Só entrega local</option>
            <option value="correios">Só Correios</option>
          </select>
          <button
            type="button"
            className="btn btn-outline !py-1.5 text-xs"
            onClick={loadOrders}
            disabled={loading}
          >
            {loading ? "…" : "Atualizar"}
          </button>
        </div>
      </div>
      <p className="text-xs text-muted">
        Pedidos separados: entrega local (WhatsApp) e Correios PAC/SEDEX
        {mode === "manda_bem"
          ? " (cotações Manda Bem / Melhor Envio)."
          : " (etiquetas Melhor Envio)."}
      </p>

      {showLocal ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-amber-900 bg-amber-50 px-3 py-2 border border-amber-100">
            Entrega local — Planaltina / Sobradinho ({localOrders.length})
          </h3>
          {renderRows(localOrders)}
        </section>
      ) : null}

      {showCorreios ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium text-sky-900 bg-sky-50 px-3 py-2 border border-sky-100">
            Correios (PAC / SEDEX) ({correiosOrders.length})
          </h3>
          {renderRows(correiosOrders)}
        </section>
      ) : null}
    </div>
  );
}
