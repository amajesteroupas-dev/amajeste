"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customerWhatsAppUrl } from "@/lib/site";

export function OrderMelhorEnvioPanel({
  orderId,
  orderNumber,
  customerPhone,
  shippingMethod,
  shippingServiceId,
  local,
  melhorEnvioId,
  labelUrl,
  trackingCode,
}: {
  orderId: string;
  orderNumber: string;
  customerPhone: string | null;
  shippingMethod: string | null;
  shippingServiceId: string | null;
  local: boolean;
  melhorEnvioId: string | null;
  labelUrl: string | null;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function run(action: "create" | "print") {
    setBusy(true);
    setMsg("");
    setErr("");
    const res = await fetch(`/api/admin/orders/${orderId}/melhor-envio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Erro");
      return;
    }
    setMsg(action === "create" ? "Etiqueta gerada" : "Link de impressão pronto");
    if (data.labelUrl) window.open(data.labelUrl, "_blank");
    router.refresh();
  }

  const customerWa = customerWhatsAppUrl(
    customerPhone,
    `Olá! Entramos em contato sobre o pedido ${orderNumber} da Majesté (entrega local Planaltina / Sobradinho).`
  );

  return (
    <section className="mt-6 border border-line bg-surface p-5 space-y-3">
      <h2 className="text-base font-medium">Melhor Envio</h2>
      <p className="text-sm text-muted">
        Frete: {shippingMethod || "—"}
        {shippingServiceId ? (
          <span className="text-xs">
            {" "}
            · serviço {shippingServiceId}
            {String(shippingServiceId).startsWith("mb-")
              ? " (etiqueta via Melhor Envio)"
              : ""}
          </span>
        ) : null}
      </p>

      {local ? (
        <div className="space-y-2">
          <p className="text-sm">
            Entrega local em Planaltina / Sobradinho — combine pelo WhatsApp.
          </p>
          {customerWa ? (
            <a
              href={customerWa}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline inline-flex"
            >
              Abrir WhatsApp
            </a>
          ) : (
            <p className="text-sm text-rose-700">
              Cliente sem telefone cadastrado — não é possível abrir o WhatsApp.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {!melhorEnvioId ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => run("create")}
            >
              {busy ? "Gerando…" : "Gerar etiqueta"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() =>
                  labelUrl ? window.open(labelUrl, "_blank") : run("print")
                }
              >
                Imprimir etiqueta
              </button>
              {trackingCode ? (
                <span className="text-sm self-center">
                  Rastreio: <code>{trackingCode}</code>
                </span>
              ) : null}
            </>
          )}
        </div>
      )}
      {err ? <p className="text-sm text-rose-700">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
    </section>
  );
}
