"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Provider = "melhor_envio" | "manda_bem" | "both";

type Status = {
  provider: Provider;
  label: string;
  melhorEnvioReady: boolean;
  mandaBemReady: boolean;
};

export function ShippingProviderSwitch({
  variant = "melhor_envio",
}: {
  /** Em qual página o bloco aparece (textos de contexto) */
  variant?: "melhor_envio" | "manda_bem";
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/settings/shipping-provider");
    const data = await res.json();
    if (res.ok) setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setProvider(provider: Provider) {
    setBusy(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/shipping-provider", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Falha ao alternar API");
      return;
    }
    setStatus(data);
    setMsg(
      provider === "manda_bem"
        ? "Melhor Envio desconectado do checkout. Cotações só pela Manda Bem."
        : provider === "melhor_envio"
          ? "Checkout só com Melhor Envio."
          : "Checkout compara as duas APIs e usa o menor preço."
    );
  }

  const active = status?.provider;

  return (
    <div className="border border-black/10 bg-white p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-medium text-[#2a2420]">
            API ativa no checkout
          </h2>
          <p className="text-xs text-muted mt-1 max-w-xl">
            Alterne para testar qual frete fica mais barato. A entrega local
            (Planaltina/Sobradinho) continua sempre disponível.
          </p>
        </div>
        {status ? (
          <span
            className={`text-xs px-2 py-1 font-medium ${
              active === "manda_bem"
                ? "bg-violet-50 text-violet-900"
                : active === "melhor_envio"
                  ? "bg-sky-50 text-sky-900"
                  : "bg-emerald-50 text-emerald-900"
            }`}
          >
            Agora: {status.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || active === "melhor_envio"}
          onClick={() => setProvider("melhor_envio")}
          className={`btn !py-2 text-xs ${
            active === "melhor_envio" ? "btn-primary" : "btn-outline"
          }`}
        >
          Só Melhor Envio
        </button>
        <button
          type="button"
          disabled={busy || active === "manda_bem"}
          onClick={() => setProvider("manda_bem")}
          className={`btn !py-2 text-xs ${
            active === "manda_bem" ? "btn-primary" : "btn-outline"
          }`}
          title="Desconecta o Melhor Envio das cotações e usa só Manda Bem"
        >
          Desconectar ME · usar Manda Bem
        </button>
        <button
          type="button"
          disabled={busy || active === "both"}
          onClick={() => setProvider("both")}
          className={`btn !py-2 text-xs ${
            active === "both" ? "btn-primary" : "btn-outline"
          }`}
        >
          Comparar as duas
        </button>
      </div>

      <p className="text-[11px] text-muted">
        Melhor Envio:{" "}
        {status?.melhorEnvioReady ? (
          <span className="text-emerald-700">token ok</span>
        ) : (
          <span className="text-amber-700">sem token</span>
        )}
        {" · "}
        Manda Bem:{" "}
        {status?.mandaBemReady ? (
          <span className="text-emerald-700">credenciais ok</span>
        ) : (
          <span className="text-amber-700">sem credenciais</span>
        )}
        {variant === "melhor_envio" ? (
          <>
            {" · "}
            <Link href="/admin/manda-bem" className="underline">
              Abrir painel Manda Bem
            </Link>
          </>
        ) : (
          <>
            {" · "}
            <Link href="/admin/frete" className="underline">
              Abrir painel Melhor Envio
            </Link>
          </>
        )}
      </p>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
    </div>
  );
}
