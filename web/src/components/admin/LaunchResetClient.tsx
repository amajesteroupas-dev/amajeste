"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "product_views" | "site_visits" | "orders";

type Props = {
  productViews: number;
  siteVisits: number;
  uniqueIps: number;
  ordersTotal: number;
  ordersPending: number;
};

export function LaunchResetClient({
  productViews,
  siteVisits,
  uniqueIps,
  ordersTotal,
  ordersPending,
}: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: Action, label: string) {
    setError(null);
    setMessage(null);
    if (confirm.trim().toUpperCase() !== "ZERAR") {
      setError('Digite ZERAR no campo abaixo para liberar as ações.');
      return;
    }
    const ok = window.confirm(
      `Confirma ${label}?\n\nEsta ação não pode ser desfeita.`
    );
    if (!ok) return;

    setLoading(action);
    try {
      const res = await fetch("/api/admin/launch-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirm: "ZERAR" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Falha ao executar.");
        return;
      }
      setMessage(data.message || "Feito.");
      setConfirm("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border border-amber-200 bg-amber-50/80 p-4 text-sm text-[#5c4530]">
        <p className="font-medium text-[#3a322c]">Antes do lançamento oficial</p>
        <p className="mt-1">
          Use estas ações para limpar dados de teste. Digite{" "}
          <span className="font-mono font-semibold">ZERAR</span> e confirme cada
          botão. Ao apagar pedidos, o estoque da loja não é alterado.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <Metric label="Visitas produtos" value={String(productViews)} />
        <Metric
          label="Visitas do site"
          value={String(siteVisits)}
          sub={`${uniqueIps} IPs únicos`}
        />
        <Metric label="Pedidos" value={String(ordersTotal)} />
        <Metric label="Pendências" value={String(ordersPending)} />
      </div>

      <label className="block text-xs text-[#5c534c] max-w-xs">
        Confirmação
        <input
          className="input mt-1 font-mono uppercase tracking-wider"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Digite ZERAR"
          autoComplete="off"
        />
      </label>

      {error ? (
        <p className="text-sm text-rose-800 border border-rose-200 bg-rose-50 px-3 py-2">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-900 border border-emerald-200 bg-emerald-50 px-3 py-2">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Zerar visitas dos produtos"
          description="Zera o contador de cada produto no dashboard."
          disabled={loading !== null}
          loading={loading === "product_views"}
          onClick={() => run("product_views", "zerar visitas dos produtos")}
        />
        <ActionCard
          title="Zerar visitas do site"
          description="Apaga o histórico de acessos por IP / dispositivo."
          disabled={loading !== null}
          loading={loading === "site_visits"}
          onClick={() => run("site_visits", "zerar visitas do site")}
        />
        <ActionCard
          title="Zerar pedidos e pendências"
          description="Apaga todos os pedidos e limpa vendas do painel. O estoque atual NÃO muda (já pode ter sido corrigido na mão)."
          danger
          disabled={loading !== null}
          loading={loading === "orders"}
          onClick={() => run("orders", "APAGAR TODOS OS PEDIDOS (sem mexer no estoque)")}
        />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-black/8 bg-white p-3">
      <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
        {label}
      </p>
      <p className="text-xl tabular-nums text-[#2a2420] mt-1">{value}</p>
      {sub ? <p className="text-[11px] text-muted mt-0.5">{sub}</p> : null}
    </div>
  );
}

function ActionCard({
  title,
  description,
  onClick,
  loading,
  disabled,
  danger,
}: {
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`border bg-white p-4 flex flex-col gap-3 ${
        danger ? "border-rose-200" : "border-black/10"
      }`}
    >
      <div>
        <h3 className="font-medium text-[#2a2420] text-sm">{title}</h3>
        <p className="text-xs text-muted mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`btn !py-2 text-sm mt-auto disabled:opacity-50 ${
          danger ? "bg-rose-800 text-white border-rose-800" : "btn-outline"
        }`}
      >
        {loading ? "Processando…" : "Executar"}
      </button>
    </div>
  );
}
