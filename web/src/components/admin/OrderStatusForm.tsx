"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABEL } from "@/lib/order-labels";

const STATUSES = Object.keys(ORDER_STATUS_LABEL);

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
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setWhatsappUrl(null);
    setEmailInfo(null);
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: form.get("status"),
        trackingCode: form.get("trackingCode"),
        notifyCustomer: true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg("Erro ao atualizar");
      return;
    }
    setMsg("Atualizado");
    if (data.notify?.whatsappUrl) {
      setWhatsappUrl(data.notify.whatsappUrl);
    }
    if (data.notify) {
      if (data.notify.emailSent) {
        setEmailInfo("E-mail de rastreio enviado ao cliente.");
      } else if (data.notify.emailError) {
        setEmailInfo(`E-mail: ${data.notify.emailError}`);
      }
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={onSubmit}
        className="flex flex-wrap gap-3 items-end border border-line bg-surface p-4"
      >
        <label className="text-sm">
          Status
          <select name="status" defaultValue={status} className="input mt-1">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
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
        {msg ? <span className="text-sm text-muted">{msg}</span> : null}
      </form>

      {emailInfo ? <p className="text-sm text-emerald-800">{emailInfo}</p> : null}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline inline-flex"
        >
          Enviar WhatsApp com rastreio ao cliente
        </a>
      ) : null}
    </div>
  );
}
