"use client";

import { FormEvent, useState } from "react";
import { formatDateTimeBR } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/order-labels";

type TrackingEvent = {
  date: string;
  description: string;
  location?: string | null;
};

type TrackingPayload = {
  code: string;
  carrier: string;
  events: TrackingEvent[];
  officialUrl: string;
  source: string;
  error?: string;
};

type ApiResult = {
  orderNumber?: string | null;
  orderStatus?: string | null;
  shippingMethod?: string | null;
  local?: boolean;
  message?: string;
  tracking?: TrackingPayload | null;
  error?: string;
};

export function TrackingLookup({
  initialCodigo = "",
  initialPedido = "",
}: {
  initialCodigo?: string;
  initialPedido?: string;
}) {
  const [codigo, setCodigo] = useState(initialCodigo);
  const [pedido, setPedido] = useState(initialPedido);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const params = new URLSearchParams();
    if (codigo.trim()) params.set("codigo", codigo.trim());
    if (pedido.trim()) params.set("pedido", pedido.trim());
    const res = await fetch(`/api/tracking?${params.toString()}`);
    const data = await res.json();
    setBusy(false);
    setResult(data);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-3 border border-line bg-surface p-5">
        <label className="block text-sm">
          Número do pedido
          <input
            className="input mt-1 w-full"
            value={pedido}
            onChange={(e) => setPedido(e.target.value)}
            placeholder="Ex.: 14"
          />
        </label>
        <label className="block text-sm">
          Código de rastreio (Correios)
          <input
            className="input mt-1 w-full font-mono uppercase"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ex.: AB123456789BR"
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Consultando…" : "Rastrear"}
        </button>
      </form>

      {result?.error && !result.tracking ? (
        <p className="text-sm text-rose-700">{result.error}</p>
      ) : null}

      {result?.local && result.message ? (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {result.message}
          {result.orderNumber ? (
            <p className="mt-2 text-xs">
              Pedido #{result.orderNumber}
              {result.orderStatus
                ? ` · ${orderStatusLabel(result.orderStatus)}`
                : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {result?.tracking ? (
        <div className="border border-line bg-surface p-5 space-y-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                {result.tracking.carrier}
              </p>
              <p className="font-mono font-semibold text-lg">
                {result.tracking.code}
              </p>
              {result.orderNumber ? (
                <p className="text-xs text-muted mt-1">
                  Pedido #{result.orderNumber}
                  {result.orderStatus
                    ? ` · ${orderStatusLabel(result.orderStatus)}`
                    : ""}
                </p>
              ) : null}
            </div>
            <a
              href={result.tracking.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline !py-2 text-xs h-fit"
            >
              Abrir nos Correios
            </a>
          </div>

          {result.tracking.error ? (
            <p className="text-sm text-muted">{result.tracking.error}</p>
          ) : null}

          {result.tracking.events.length > 0 ? (
            <ol className="space-y-3 border-t border-line pt-4">
              {result.tracking.events.map((ev, i) => (
                <li key={`${ev.date}-${i}`} className="text-sm">
                  <p className="font-medium text-[#2a2420]">{ev.description}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {ev.date ? formatDateTimeBR(ev.date, { seconds: true }) : "—"}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
