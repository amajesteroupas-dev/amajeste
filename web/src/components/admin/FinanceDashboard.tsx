"use client";

import { FormEvent, useMemo, useState } from "react";
import { formatBRL } from "@/lib/utils";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { ManualSaleForm } from "@/components/admin/ManualSaleForm";
import { FinanceMonthFilter } from "@/components/admin/FinanceMonthFilter";
import {
  FinanceStockMarginTab,
  type StockMarginRow,
} from "@/components/admin/FinanceStockMarginTab";
import {
  defaultMarginSettings,
  monthlyMarketingTotal,
  type FinanceMarginSettings,
} from "@/lib/finance-margin";

type Tab =
  | "visao"
  | "custos"
  | "estoque"
  | "impostos"
  | "nfe"
  | "impressao"
  | "operacoes";

export type FinanceDashboardProps = {
  monthKey: string;
  monthLabel: string;
  monthOptions: { value: string; label: string }[];
  kpis: {
    revenue: number;
    expenseTotal: number;
    grossProfit: number;
    net: number;
    margin: number;
    inventoryValue: number;
    inventoryUnits: number;
    productSpend: number;
    cogs: number;
    cogsPackaging: number;
    salesRevenueOrders: number;
    paidOrdersCount: number;
    taxMonth: number;
    taxOnSalesPct: number;
    netAfterTax: number;
    paymentFees: number;
    salesReceived: number;
    marketingMonth: number;
    fixedMonth: number;
    channelProfit: number;
    lucroFinal: number;
    feeSettlementLabel: string;
  };
  salesByChannel: {
    channel: "pix" | "card" | "other";
    label: string;
    orders: number;
    sales: number;
    feePercent: number;
    feeAmount: number;
    received: number;
    cogs: number;
    tax: number;
    profit: number;
  }[];
  productTaxRows: {
    productName: string;
    qty: number;
    revenue: number;
    merchandise: number;
    packaging: number;
    tax: number;
    margin: number;
  }[];
  costPreviewRows: {
    id: string;
    label: string;
    stock: number;
    price: number;
    merchandise: number;
    packaging: number;
    tax: number;
    totalCost: number;
    margin: number;
    marginPct: number;
  }[];
  stockMarginRows: StockMarginRow[];
  livePromotions: {
    id: string;
    label: string;
    enabled: boolean;
    percent: number;
    startsAt: string | null;
    endsAt: string | null;
    scope: "all" | "pix" | "card";
    cardInstallmentsMax: number | null;
    createdAt: string;
  }[];
  unpaidExpenses: {
    id: string;
    description: string;
    category: string;
    amount: number;
    dueDate: string | null;
  }[];
  cashEntries: {
    id: string;
    date: string;
    type: string;
    description: string;
    category: string | null;
    amount: number;
  }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    guestName: string | null;
    total: number;
    createdAt: string;
    nfeStatus: string | null;
    printStatus: string | null;
  }[];
  saleVariants: {
    id: string;
    productName: string;
    size: string;
    color: string;
    sku: string;
    stock: number;
    price: number;
  }[];
  settings: {
    costs: {
      boxCost: number;
      labelCost: number;
      bagCost: number;
      otherCost: number;
      taxPercent: number;
    };
    nfe: {
      enabled: boolean;
      autoEmitOnPaid: boolean;
      provider: string;
      environment: string;
      companyCnpj: string;
      companyId: string;
      hasToken: boolean;
      tokenMasked: string;
    };
    print: {
      enabled: boolean;
      autoOnPaid: boolean;
      provider: string;
      printNodePrinterId: string;
      hasApiKey: boolean;
      apiKeyMasked: string;
    };
    margin?: FinanceMarginSettings;
  };
};

function Kpi({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-800"
      : tone === "warn"
        ? "text-amber-800"
        : tone === "bad"
          ? "text-rose-800"
          : "text-[#1c1917]";
  return (
    <div className="rounded-sm border border-black/8 bg-white p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7468]">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-[#8a7468]">{sub}</p> : null}
    </div>
  );
}

export function FinanceDashboard(props: FinanceDashboardProps) {
  const [tab, setTab] = useState<Tab>("visao");
  const [settings, setSettings] = useState({
    ...props.settings,
    margin: props.settings.margin || defaultMarginSettings(),
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [nfeToken, setNfeToken] = useState("");
  const [printKey, setPrintKey] = useState("");
  const [printJobs, setPrintJobs] = useState<
    {
      id: string;
      orderNumber: string;
      guestName: string | null;
      total: number;
      html?: string | null;
      status: string;
      error: string | null;
    }[]
  >([]);
  const [printBusy, setPrintBusy] = useState(false);

  const tabs: { id: Tab; label: string }[] = [
    { id: "visao", label: "Visão geral" },
    { id: "custos", label: "Custos do produto" },
    { id: "estoque", label: "Estoque / Margem" },
    { id: "impostos", label: "Impostos" },
    { id: "nfe", label: "Nota fiscal" },
    { id: "impressao", label: "Impressão" },
    { id: "operacoes", label: "Operações" },
  ];

  const packagingTotal = useMemo(
    () =>
      settings.costs.boxCost +
      settings.costs.labelCost +
      settings.costs.bagCost +
      settings.costs.otherCost,
    [settings.costs]
  );

  async function saveSettings(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/finance/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        costs: settings.costs,
        nfe: {
          ...settings.nfe,
          apiToken: nfeToken.trim() || undefined,
        },
        print: {
          ...settings.print,
          printNodeApiKey: printKey.trim() || undefined,
        },
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Falha ao salvar");
      return;
    }
    setSettings({
      costs: json.costs,
      nfe: json.nfe,
      print: json.print,
      margin: json.margin || settings.margin,
    });
    setNfeToken("");
    setPrintKey("");
    setMsg("Configurações salvas — os próximos pedidos usam esses valores.");
  }

  async function loadPrintQueue() {
    setPrintBusy(true);
    const res = await fetch("/api/admin/finance/print");
    const json = await res.json();
    setPrintBusy(false);
    if (res.ok) setPrintJobs(json.jobs || []);
  }

  async function browserPrint(job: { id: string; html?: string | null }) {
    if (!job.html) return;
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) {
      setError("Permita pop-ups para imprimir.");
      return;
    }
    w.document.write(job.html);
    w.document.close();
    w.focus();
    w.print();
    await fetch(`/api/admin/finance/print/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PRINTED" }),
    });
    await loadPrintQueue();
  }

  async function emitNfe(orderId: string) {
    setError("");
    setMsg("");
    const res = await fetch(`/api/admin/finance/nfe/${orderId}`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setError(json.error || "Falha ao emitir NF-e");
      return;
    }
    setMsg(
      json.skipped
        ? "NF-e desativada ou provedor não configurado."
        : `NF-e: ${json.status}${json.number ? ` nº ${json.number}` : ""}`
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a85f64]">
            Controle financeiro
          </p>
          <h1
            className="text-3xl md:text-4xl text-[#1c1917]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Financeiro
          </h1>
          <p className="text-sm text-[#6b5e55] mt-1">
            Caixa, custos, impostos, NF-e e impressão ·{" "}
            <strong>{props.monthLabel}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FinanceMonthFilter
            value={props.monthKey}
            options={props.monthOptions}
          />
          <a
            href={`/api/admin/finance/export?mes=${props.monthKey}`}
            className="btn btn-outline !py-2 !px-3 text-xs"
          >
            Exportar CSV
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-black/10 pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "impressao") void loadPrintQueue();
            }}
            className={`px-3 py-2 text-sm transition-colors ${
              tab === t.id
                ? "border-b-2 border-[#a85f64] text-[#1c1917] font-medium"
                : "text-[#8a7468] hover:text-[#1c1917]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

      {tab === "visao" ? (
        <div className="space-y-4">
          {(() => {
            const goal = Number(settings.margin?.monthlySalesGoal) || 0;
            const done = props.kpis.salesRevenueOrders;
            const pct = goal > 0 ? Math.min(999, (done / goal) * 100) : 0;
            return (
              <section className="border border-[#c9a24a]/40 bg-[#fbf8f0] p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7468]">
                      Meta de vendas · {props.monthLabel}
                    </p>
                    <p className="text-2xl font-semibold text-[#2a2420] mt-1 tabular-nums">
                      {goal > 0 ? formatBRL(goal) : "Sem meta cadastrada"}
                    </p>
                    <p className="text-xs text-[#5c534c] mt-1">
                      Realizado em pedidos pagos:{" "}
                      <strong>{formatBRL(done)}</strong>
                      {goal > 0 ? ` · ${pct.toFixed(0)}% da meta` : null}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline !py-1.5 !px-3 text-xs"
                    onClick={() => setTab("estoque")}
                  >
                    {goal > 0 ? "Editar meta" : "Cadastrar meta"}
                  </button>
                </div>
                {goal > 0 ? (
                  <div className="h-2.5 bg-black/10 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        pct >= 100 ? "bg-emerald-600" : "bg-[#c9a24a]"
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-[#7a7168]">
                    Defina a meta em Estoque / Margem para acompanhar o mês.
                  </p>
                )}
              </section>
            );
          })()}

          {(() => {
            const mk = monthlyMarketingTotal(
              settings.margin?.marketingCosts ?? []
            );
            if (mk <= 0) return null;
            return (
              <section className="border border-black/8 bg-white p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8a7468]">
                    Investimento em marketing (mês planejado)
                  </p>
                  <p className="text-xl font-semibold tabular-nums mt-1">
                    {formatBRL(mk)}
                  </p>
                  <p className="text-xs text-[#7a7168] mt-0.5">
                    Rateado nas margens em Estoque / Margem
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline !py-1.5 !px-3 text-xs"
                  onClick={() => setTab("estoque")}
                >
                  Editar marketing
                </button>
              </section>
            );
          })()}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Lucro final do mês"
              value={formatBRL(props.kpis.lucroFinal)}
              sub="vendas − taxas Pix/cartão − CMV − imposto − marketing − fixos"
              tone={props.kpis.lucroFinal >= 0 ? "good" : "bad"}
            />
            <Kpi
              label="Vendas pagas"
              value={formatBRL(props.kpis.salesRevenueOrders)}
              sub={`${props.kpis.paidOrdersCount} pedido(s)`}
            />
            <Kpi
              label="Taxas Pix + cartão"
              value={formatBRL(props.kpis.paymentFees)}
              sub={`cartão como 1x · receb. ${props.kpis.feeSettlementLabel}`}
              tone="warn"
            />
            <Kpi
              label="Líquido após taxas"
              value={formatBRL(props.kpis.salesReceived)}
              sub="vendas − taxas do gateway"
              tone="good"
            />
          </div>

          <section className="border border-black/8 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[#2a2420]">
                  Vendas pagas · Pix e cartão · {props.monthLabel}
                </h2>
                <p className="text-[11px] text-[#7a7168] mt-0.5">
                  Lucro por canal = venda − taxa do meio − CMV/embalagem −
                  imposto. Taxas do cartão usam 1x (parcelas não ficam no
                  pedido).
                </p>
              </div>
              <p className="text-xs text-[#5c534c]">
                Lucro canais (sem fixos/marketing):{" "}
                <strong
                  className={
                    props.kpis.channelProfit >= 0
                      ? "text-emerald-800"
                      : "text-rose-700"
                  }
                >
                  {formatBRL(props.kpis.channelProfit)}
                </strong>
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Meio</th>
                    <th>Pedidos</th>
                    <th>Vendas</th>
                    <th>Taxa média</th>
                    <th>Taxas</th>
                    <th>Líquido</th>
                    <th>CMV</th>
                    <th>Imposto</th>
                    <th>Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {props.salesByChannel.map((r) => (
                    <tr key={r.channel}>
                      <td className="font-medium">{r.label}</td>
                      <td className="tabular-nums">{r.orders}</td>
                      <td className="tabular-nums">{formatBRL(r.sales)}</td>
                      <td className="tabular-nums">
                        {r.feePercent.toFixed(2).replace(".", ",")}%
                      </td>
                      <td className="tabular-nums text-amber-900">
                        {formatBRL(r.feeAmount)}
                      </td>
                      <td className="tabular-nums">{formatBRL(r.received)}</td>
                      <td className="tabular-nums">{formatBRL(r.cogs)}</td>
                      <td className="tabular-nums">{formatBRL(r.tax)}</td>
                      <td
                        className={`tabular-nums font-semibold ${
                          r.profit >= 0 ? "text-emerald-800" : "text-rose-700"
                        }`}
                      >
                        {formatBRL(r.profit)}
                      </td>
                    </tr>
                  ))}
                  {props.salesByChannel.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-muted">
                        Nenhuma venda paga neste mês.
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-[#faf7f3] font-medium">
                      <td>Total</td>
                      <td className="tabular-nums">
                        {props.kpis.paidOrdersCount}
                      </td>
                      <td className="tabular-nums">
                        {formatBRL(props.kpis.salesRevenueOrders)}
                      </td>
                      <td>—</td>
                      <td className="tabular-nums text-amber-900">
                        {formatBRL(props.kpis.paymentFees)}
                      </td>
                      <td className="tabular-nums">
                        {formatBRL(props.kpis.salesReceived)}
                      </td>
                      <td className="tabular-nums">
                        {formatBRL(props.kpis.cogs)}
                      </td>
                      <td className="tabular-nums">
                        {formatBRL(props.kpis.taxMonth)}
                      </td>
                      <td
                        className={`tabular-nums font-semibold ${
                          props.kpis.channelProfit >= 0
                            ? "text-emerald-800"
                            : "text-rose-700"
                        }`}
                      >
                        {formatBRL(props.kpis.channelProfit)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {(props.kpis.marketingMonth > 0 || props.kpis.fixedMonth > 0) && (
              <p className="text-[11px] text-[#7a7168]">
                No lucro final também entram marketing (
                {formatBRL(props.kpis.marketingMonth)}) e custos fixos (
                {formatBRL(props.kpis.fixedMonth)}) do mês.
              </p>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label={`Receitas (caixa) · ${props.monthLabel}`}
              value={formatBRL(props.kpis.revenue)}
              tone="good"
            />
            <Kpi
              label={`Despesas · ${props.monthLabel}`}
              value={formatBRL(props.kpis.expenseTotal)}
            />
            <Kpi
              label="Lucro bruto (caixa)"
              value={formatBRL(props.kpis.grossProfit)}
              sub={`após CMV+embalagem · margem ${props.kpis.margin.toFixed(0)}%`}
              tone={props.kpis.grossProfit >= 0 ? "good" : "bad"}
            />
            <Kpi
              label="Saldo caixa"
              value={formatBRL(props.kpis.net)}
              sub="receitas − despesas"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi
              label="Impostos do mês"
              value={formatBRL(props.kpis.taxMonth)}
              sub={`${props.kpis.taxOnSalesPct.toFixed(1)}% sobre vendas`}
              tone="warn"
            />
            <Kpi
              label="Lucro após imposto (caixa)"
              value={formatBRL(props.kpis.netAfterTax)}
              sub="lucro bruto caixa − imposto estimado"
            />
            <Kpi
              label="CMV + embalagem"
              value={formatBRL(props.kpis.cogs)}
              sub={`embalagem ${formatBRL(props.kpis.cogsPackaging)}`}
            />
            <Kpi
              label="Valor em estoque"
              value={formatBRL(props.kpis.inventoryValue)}
              sub={`${props.kpis.inventoryUnits} un. × custo médio`}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Kpi
              label="Compras de produto"
              value={formatBRL(props.kpis.productSpend)}
              sub={props.monthLabel}
            />
            <Kpi
              label="Embalagem unitária (cadastro)"
              value={formatBRL(packagingTotal)}
              sub="caixa + etiqueta + sacola + outros"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="border border-black/8 bg-white p-4">
              <h2 className="text-sm font-semibold mb-3">Contas a pagar</h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Valor</th>
                    <th>Venc.</th>
                  </tr>
                </thead>
                <tbody>
                  {props.unpaidExpenses.map((e) => (
                    <tr key={e.id}>
                      <td>
                        {e.description}
                        <span className="block text-[11px] text-muted">
                          {e.category}
                        </span>
                      </td>
                      <td>{formatBRL(e.amount)}</td>
                      <td>{e.dueDate || "—"}</td>
                    </tr>
                  ))}
                  {props.unpaidExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-muted">
                        Nenhuma conta aberta
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
            <section className="border border-black/8 bg-white p-4">
              <h2 className="text-sm font-semibold mb-3">
                Fluxo de caixa · {props.monthLabel}
              </h2>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Desc</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {props.cashEntries.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>{e.type === "INCOME" ? "Receita" : "Despesa"}</td>
                      <td>
                        {e.description}
                        {e.category ? (
                          <span className="block text-[11px] text-muted">
                            {e.category}
                          </span>
                        ) : null}
                      </td>
                      <td>{formatBRL(e.amount)}</td>
                    </tr>
                  ))}
                  {props.cashEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-muted">
                        Nenhum lançamento neste mês
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      ) : null}

      {tab === "custos" ? (
        <form onSubmit={saveSettings} className="space-y-5 max-w-4xl">
          <div className="border border-black/8 bg-white p-5 space-y-4">
            <div>
              <h2 className="text-lg font-medium">Custos por unidade vendida</h2>
              <p className="text-xs text-muted mt-1">
                Estes valores entram no cálculo automático de custo total,
                margem e impostos nos pedidos novos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ["boxCost", "Caixa / embalagem (R$)"],
                  ["labelCost", "Etiqueta (R$)"],
                  ["bagCost", "Sacola (R$)"],
                  ["otherCost", "Outros fixos (R$)"],
                  ["taxPercent", "Imposto estimado (%)"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="block text-xs uppercase tracking-wider text-muted"
                >
                  {label}
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input mt-1"
                    value={settings.costs[key]}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        costs: {
                          ...s.costs,
                          [key]: Number(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="text-sm text-[#5c534c]">
              Embalagem unitária total:{" "}
              <strong>{formatBRL(packagingTotal)}</strong>
              {" · "}
              Imposto: <strong>{settings.costs.taxPercent}%</strong> do preço de
              venda
            </p>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar custos e imposto"}
            </button>
          </div>

          <section className="border border-black/8 bg-white p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">
              Simulação por produto (estoque atual)
            </h2>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Estoque</th>
                  <th>Preço</th>
                  <th>Mercadoria</th>
                  <th>Embalagem</th>
                  <th>Imposto</th>
                  <th>Custo total</th>
                  <th>Margem</th>
                </tr>
              </thead>
              <tbody>
                {props.costPreviewRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.label}</td>
                    <td>{r.stock}</td>
                    <td>{formatBRL(r.price)}</td>
                    <td>{formatBRL(r.merchandise)}</td>
                    <td>{formatBRL(r.packaging)}</td>
                    <td>{formatBRL(r.tax)}</td>
                    <td>{formatBRL(r.totalCost)}</td>
                    <td>
                      {formatBRL(r.margin)}
                      <span className="block text-[11px] text-muted">
                        {r.marginPct.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </form>
      ) : null}

      {tab === "estoque" ? (
        <FinanceStockMarginTab
          rows={props.stockMarginRows}
          initialMargin={settings.margin || defaultMarginSettings()}
          livePromotions={props.livePromotions}
          monthSales={props.kpis.salesRevenueOrders}
          monthLabel={props.monthLabel}
          onSaved={(margin, taxPercent) => {
            setSettings((s) => ({
              ...s,
              margin,
              costs: { ...s.costs, taxPercent },
            }));
          }}
        />
      ) : null}

      {tab === "impostos" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi
              label="Imposto no mês"
              value={formatBRL(props.kpis.taxMonth)}
              tone="warn"
            />
            <Kpi
              label="% sobre vendas"
              value={`${props.kpis.taxOnSalesPct.toFixed(2)}%`}
            />
            <Kpi
              label="Alíquota cadastrada"
              value={`${settings.costs.taxPercent}%`}
              sub="ajustável em Custos do produto"
            />
          </div>
          <section className="border border-black/8 bg-white p-4 overflow-x-auto">
            <h2 className="text-sm font-semibold mb-3">
              Imposto por produto · {props.monthLabel}
            </h2>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Receita</th>
                  <th>Mercadoria</th>
                  <th>Embalagem</th>
                  <th>Imposto</th>
                  <th>Margem líquida</th>
                </tr>
              </thead>
              <tbody>
                {props.productTaxRows.map((r) => (
                  <tr key={r.productName}>
                    <td>{r.productName}</td>
                    <td>{r.qty}</td>
                    <td>{formatBRL(r.revenue)}</td>
                    <td>{formatBRL(r.merchandise)}</td>
                    <td>{formatBRL(r.packaging)}</td>
                    <td>{formatBRL(r.tax)}</td>
                    <td>{formatBRL(r.margin)}</td>
                  </tr>
                ))}
                {props.productTaxRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-muted">
                      Sem vendas pagas neste mês
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === "nfe" ? (
        <form onSubmit={saveSettings} className="space-y-5 max-w-3xl">
          <div className="border border-black/8 bg-white p-5 space-y-3">
            <h2 className="text-lg font-medium">Integração NF-e</h2>
            <p className="text-xs text-muted">
              Conecte Focus NFe ou Nuvem Fiscal. Com “emitir ao pagar”, a nota
              sai automaticamente quando o pedido for aprovado.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.nfe.enabled}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    nfe: { ...s.nfe, enabled: e.target.checked },
                  }))
                }
              />
              NF-e ativa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.nfe.autoEmitOnPaid}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    nfe: { ...s.nfe, autoEmitOnPaid: e.target.checked },
                  }))
                }
              />
              Emitir automaticamente ao confirmar pagamento
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Provedor
              <select
                className="input mt-1"
                value={settings.nfe.provider}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    nfe: { ...s.nfe, provider: e.target.value },
                  }))
                }
              >
                <option value="none">Nenhum</option>
                <option value="focus">Focus NFe</option>
                <option value="nuvemfiscal">Nuvem Fiscal</option>
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Ambiente
              <select
                className="input mt-1"
                value={settings.nfe.environment}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    nfe: { ...s.nfe, environment: e.target.value },
                  }))
                }
              >
                <option value="sandbox">Homologação</option>
                <option value="production">Produção</option>
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              CNPJ emitente
              <input
                className="input mt-1"
                value={settings.nfe.companyCnpj}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    nfe: { ...s.nfe, companyCnpj: e.target.value },
                  }))
                }
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Token API
              <input
                type="password"
                className="input mt-1 font-mono text-sm"
                value={nfeToken}
                onChange={(e) => setNfeToken(e.target.value)}
                placeholder={
                  settings.nfe.hasToken
                    ? `Salvo: ${settings.nfe.tokenMasked}`
                    : "Cole o token do provedor"
                }
              />
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Salvando…" : "Salvar NF-e"}
            </button>
          </div>

          <section className="border border-black/8 bg-white p-4">
            <h2 className="text-sm font-semibold mb-3">
              Pedidos recentes · emitir manual
            </h2>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>NF-e</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {props.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{o.guestName || "—"}</td>
                    <td>{formatBRL(o.total)}</td>
                    <td>{o.nfeStatus || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => emitNfe(o.id)}
                      >
                        Emitir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </form>
      ) : null}

      {tab === "impressao" ? (
        <form onSubmit={saveSettings} className="space-y-5 max-w-3xl">
          <div className="border border-black/8 bg-white p-5 space-y-3">
            <h2 className="text-lg font-medium">Impressão automática</h2>
            <p className="text-xs text-muted">
              Com PrintNode (app no PC de casa), o pedido pago pode ir direto
              para a impressora. Sem PrintNode, os jobs ficam na fila para você
              imprimir pelo navegador.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.print.enabled}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    print: { ...s.print, enabled: e.target.checked },
                  }))
                }
              />
              Impressão ativa
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.print.autoOnPaid}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    print: { ...s.print, autoOnPaid: e.target.checked },
                  }))
                }
              />
              Enviar à impressora ao confirmar pagamento
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Provedor
              <select
                className="input mt-1"
                value={settings.print.provider}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    print: { ...s.print, provider: e.target.value },
                  }))
                }
              >
                <option value="queue">Fila (imprimir no navegador)</option>
                <option value="printnode">PrintNode (PC de casa)</option>
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              PrintNode API Key
              <input
                type="password"
                className="input mt-1 font-mono text-sm"
                value={printKey}
                onChange={(e) => setPrintKey(e.target.value)}
                placeholder={
                  settings.print.hasApiKey
                    ? `Salvo: ${settings.print.apiKeyMasked}`
                    : "API key PrintNode"
                }
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              ID da impressora PrintNode
              <input
                className="input mt-1"
                value={settings.print.printNodePrinterId}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    print: {
                      ...s.print,
                      printNodePrinterId: e.target.value,
                    },
                  }))
                }
                placeholder="Ex.: 728192"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando…" : "Salvar impressão"}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={printBusy}
                onClick={() => loadPrintQueue()}
              >
                Atualizar fila
              </button>
            </div>
          </div>

          <section className="border border-black/8 bg-white p-4">
            <h2 className="text-sm font-semibold mb-3">Fila pendente</h2>
            <table className="table text-sm">
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {printJobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.orderNumber}</td>
                    <td>{j.guestName || "—"}</td>
                    <td>{formatBRL(j.total)}</td>
                    <td>
                      {j.status}
                      {j.error ? (
                        <span className="block text-[11px] text-rose-700">
                          {j.error}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => browserPrint(j)}
                      >
                        Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
                {printJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      Fila vazia
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        </form>
      ) : null}

      {tab === "operacoes" ? (
        <div className="space-y-6">
          <ManualSaleForm variants={props.saleVariants} />
          <ExpenseForm />
        </div>
      ) : null}
    </div>
  );
}
