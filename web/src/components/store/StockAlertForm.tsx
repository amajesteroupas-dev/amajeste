"use client";

import { FormEvent, useState } from "react";

type Props = {
  productId: string;
  productName: string;
  variantId?: string;
  size?: string;
  color?: string;
};

export function StockAlertForm({
  productId,
  productName,
  variantId,
  size,
  color,
}: Props) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: phone || undefined,
          productId,
          variantId,
          size,
          color,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Não foi possível cadastrar o aviso.");
        return;
      }
      setStatus("ok");
      setMessage(
        data.message ||
          "Pronto! Avisaremos quando este item estiver disponível."
      );
      setEmail("");
      setPhone("");
    } catch {
      setStatus("error");
      setMessage("Falha de conexão. Tente novamente.");
    }
  }

  if (status === "ok") {
    return (
      <div className="border border-line bg-[#f7f1ea] px-4 py-4 text-sm text-[#3d2f28]">
        <p className="font-medium">Aviso cadastrado</p>
        <p className="mt-1 text-muted">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="border border-line bg-white p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">Avise-me quando chegar</p>
        <p className="text-xs text-muted mt-1">
          {productName}
          {size || color
            ? ` · ${[size, color].filter(Boolean).join(" / ")}`
            : ""}{" "}
          está esgotado. Deixe seu contato e avisamos por e-mail.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs uppercase tracking-wider text-muted">
          E-mail *
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1.5 w-full normal-case tracking-normal"
            placeholder="seu@email.com"
            autoComplete="email"
          />
        </label>
        <label className="block text-xs uppercase tracking-wider text-muted">
          WhatsApp (opcional)
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="input mt-1.5 w-full normal-case tracking-normal"
            placeholder="(61) 99999-9999"
            autoComplete="tel"
          />
        </label>
      </div>
      {status === "error" && message && (
        <p className="text-sm text-red-700">{message}</p>
      )}
      <button
        type="submit"
        className="btn btn-primary w-full sm:w-auto"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Enviando…" : "Avise-me quando chegar"}
      </button>
    </form>
  );
}
