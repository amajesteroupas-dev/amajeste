"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatBRL, formatBRLInput, parseBRLMoney } from "@/lib/utils";
import {
  SIMPLES_BRACKETS,
  checkoutCtxFromSim,
  computeUnitMargin,
  effectiveSimplesPercent,
  fixedCostPerUnit,
  getActiveGateway,
  marketingCostPerUnit,
  mercadoPagoPreset,
  monthlyFixedTotal,
  monthlyMarketingTotal,
  newFixedCostId,
  newMarketingCostId,
  resolveGatewayFee,
  salePriceAfterPromo,
  settlementLabel,
  type FinanceMarginSettings,
  type SettlementTiming,
} from "@/lib/finance-margin";
import {
  pickBestPromotion,
  type SitePromotion,
} from "@/lib/promotion-pricing";
import { FinanceGatewayFeesEditor } from "@/components/admin/FinanceGatewayFeesEditor";
import { FinanceCollapse } from "@/components/admin/FinanceCollapse";

export type StockMarginRow = {
  id: string;
  label: string;
  stock: number;
  price: number;
  merchandise: number;
  packaging: number;
};

type Props = {
  rows: StockMarginRow[];
  initialMargin: FinanceMarginSettings;
  livePromotions: SitePromotion[];
  /** Vendas pagas do mês selecionado no filtro */
  monthSales: number;
  monthLabel: string;
  onSaved: (margin: FinanceMarginSettings, taxPercent: number) => void;
};

const SETTLEMENTS: SettlementTiming[] = ["instant", "d14", "d30"];

export function FinanceStockMarginTab({
  rows,
  initialMargin,
  livePromotions,
  monthSales,
  monthLabel,
  onSaved,
}: Props) {
  const [margin, setMargin] = useState<FinanceMarginSettings>(() => {
    const gateways =
      initialMargin.gateways?.length > 0
        ? initialMargin.gateways
        : [mercadoPagoPreset()];
    return {
      ...initialMargin,
      marketingCosts: initialMargin.marketingCosts ?? [],
      gateways,
      activeGatewayId:
        initialMargin.activeGatewayId || gateways[0].id,
      promoPreferInstant: Boolean(initialMargin.promoPreferInstant),
    };
  });
  const [methodId, setMethodId] = useState(() => {
    const gw = getActiveGateway({
      ...initialMargin,
      gateways:
        initialMargin.gateways?.length > 0
          ? initialMargin.gateways
          : [mercadoPagoPreset()],
      activeGatewayId: initialMargin.activeGatewayId || "gw_mercadopago",
      promoPreferInstant: false,
    });
    return (
      gw.methods.find((m) => m.kind === "pix")?.id ||
      gw.methods[0]?.id ||
      ""
    );
  });
  const [settlement, setSettlement] = useState<SettlementTiming>("instant");
  const [installments, setInstallments] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [goalText, setGoalText] = useState(() =>
    formatBRLInput(Number(initialMargin.monthlySalesGoal) || 0)
  );

  const gateway = useMemo(() => getActiveGateway(margin), [margin]);

  useEffect(() => {
    if (!gateway.methods.some((m) => m.id === methodId)) {
      setMethodId(
        gateway.methods.find((m) => m.kind === "pix")?.id ||
          gateway.methods[0]?.id ||
          ""
      );
      setInstallments(1);
    }
  }, [gateway, methodId]);

  const currentMethod =
    gateway.methods.find((m) => m.id === methodId) || gateway.methods[0];

  const effectiveSettlement: SettlementTiming = margin.promoPreferInstant
    ? "instant"
    : settlement;

  const resolvedFee = useMemo(() => {
    if (!currentMethod) {
      return resolveGatewayFee({
        gateway,
        methodId: gateway.methods[0]?.id || "",
        settlement: effectiveSettlement,
        installments,
      });
    }
    return resolveGatewayFee({
      gateway,
      methodId: currentMethod.id,
      settlement: effectiveSettlement,
      installments,
    });
  }, [gateway, currentMethod, effectiveSettlement, installments]);

  const totalStock = useMemo(
    () => rows.reduce((s, r) => s + Math.max(0, r.stock), 0),
    [rows]
  );

  const simplesPct = useMemo(
    () =>
      effectiveSimplesPercent(margin.simplesBracketId, margin.revenue12m),
    [margin.simplesBracketId, margin.revenue12m]
  );

  const fixedMonthly = monthlyFixedTotal(margin.fixedCosts);
  const fixedUnit = fixedCostPerUnit({
    fixedCosts: margin.fixedCosts,
    allocation: margin.fixedAllocation,
    totalStockUnits: totalStock,
    expectedMonthlyUnits: margin.expectedMonthlyUnits,
  });

  const marketingMonthly = monthlyMarketingTotal(margin.marketingCosts ?? []);
  const marketingUnit = marketingCostPerUnit({
    marketingCosts: margin.marketingCosts ?? [],
    allocation: margin.fixedAllocation,
    totalStockUnits: totalStock,
    expectedMonthlyUnits: margin.expectedMonthlyUnits,
  });

  /** Promo que o checkout aplicaria neste meio + parcelas. */
  const checkoutPromo = useMemo(() => {
    return pickBestPromotion(
      livePromotions,
      checkoutCtxFromSim({
        methodKind: currentMethod?.kind || "pix",
        installments,
      })
    );
  }, [livePromotions, currentMethod, installments]);

  /**
   * Promo usada na análise com/sem promo.
   * Se em 2x–12x não houver match (ex.: promo só 1x), ainda assim usa a melhor
   * promo do meio em 1x — para comparar margem sob a taxa do parcelado.
   */
  const analysisPromo = useMemo(() => {
    if (checkoutPromo) return checkoutPromo;
    if (installments <= 1) return null;
    return pickBestPromotion(
      livePromotions,
      checkoutCtxFromSim({
        methodKind: currentMethod?.kind || "pix",
        installments: 1,
      })
    );
  }, [checkoutPromo, livePromotions, currentMethod, installments]);

  const promoPercent = analysisPromo?.percent || 0;
  const promoAppliesAtCheckout = Boolean(checkoutPromo);

  const computed = useMemo(() => {
    return rows.map((r) => {
      const full = computeUnitMargin({
        salePrice: r.price,
        merchandise: r.merchandise,
        packaging: r.packaging,
        feePercent: resolvedFee.totalPercent,
        feeFixed: resolvedFee.fixedAmount,
        simplesPercent: simplesPct,
        fixedPerUnit: fixedUnit,
        marketingPerUnit: marketingUnit,
      });
      const promoSale = salePriceAfterPromo(r.price, promoPercent);
      const withPromo = computeUnitMargin({
        salePrice: promoSale,
        merchandise: r.merchandise,
        packaging: r.packaging,
        feePercent: resolvedFee.totalPercent,
        feeFixed: resolvedFee.fixedAmount,
        simplesPercent: simplesPct,
        fixedPerUnit: fixedUnit,
        marketingPerUnit: marketingUnit,
      });
      const stock = Math.max(0, r.stock);
      return {
        ...r,
        full,
        withPromo,
        stockProfitFull: Math.round(full.profit * stock * 100) / 100,
        stockProfitPromo: Math.round(withPromo.profit * stock * 100) / 100,
      };
    });
  }, [
    rows,
    resolvedFee,
    simplesPct,
    fixedUnit,
    marketingUnit,
    promoPercent,
  ]);

  /** Comparativo lucro estoque por prazo (na hora / 14d / 30d) no meio atual */
  const settlementCompare = useMemo(() => {
    if (!currentMethod) return [];
    return SETTLEMENTS.map((timing) => {
      const fee = resolveGatewayFee({
        gateway,
        methodId: currentMethod.id,
        settlement: timing,
        installments,
      });
      const profitFull = rows.reduce((s, r) => {
        const m = computeUnitMargin({
          salePrice: r.price,
          merchandise: r.merchandise,
          packaging: r.packaging,
          feePercent: fee.totalPercent,
          feeFixed: fee.fixedAmount,
          simplesPercent: simplesPct,
          fixedPerUnit: fixedUnit,
          marketingPerUnit: marketingUnit,
        });
        return s + m.profit * Math.max(0, r.stock);
      }, 0);
      const profitPromo = rows.reduce((s, r) => {
        const promoSale = salePriceAfterPromo(r.price, promoPercent);
        const m = computeUnitMargin({
          salePrice: promoSale,
          merchandise: r.merchandise,
          packaging: r.packaging,
          feePercent: fee.totalPercent,
          feeFixed: fee.fixedAmount,
          simplesPercent: simplesPct,
          fixedPerUnit: fixedUnit,
          marketingPerUnit: marketingUnit,
        });
        return s + m.profit * Math.max(0, r.stock);
      }, 0);
      return {
        timing,
        fee,
        profitFull: Math.round(profitFull * 100) / 100,
        profitPromo: Math.round(profitPromo * 100) / 100,
        available: currentMethod.settlements.some((x) => x.timing === timing),
      };
    }).filter((x) => x.available);
  }, [
    currentMethod,
    gateway,
    installments,
    rows,
    simplesPct,
    fixedUnit,
    marketingUnit,
    promoPercent,
  ]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return computed;
    return computed.filter((r) => r.label.toLowerCase().includes(t));
  }, [computed, q]);

  const totals = useMemo(() => {
    const stockUnits = computed.reduce((s, r) => s + Math.max(0, r.stock), 0);
    const saleFull = computed.reduce(
      (s, r) => s + r.full.sale * Math.max(0, r.stock),
      0
    );
    const salePromo = computed.reduce(
      (s, r) => s + r.withPromo.sale * Math.max(0, r.stock),
      0
    );
    const profitFull = computed.reduce((s, r) => s + r.stockProfitFull, 0);
    const profitPromo = computed.reduce((s, r) => s + r.stockProfitPromo, 0);
    const receivedFull = computed.reduce(
      (s, r) => s + r.full.received * Math.max(0, r.stock),
      0
    );
    const receivedPromo = computed.reduce(
      (s, r) => s + r.withPromo.received * Math.max(0, r.stock),
      0
    );
    return {
      stockUnits,
      saleFull: Math.round(saleFull * 100) / 100,
      salePromo: Math.round(salePromo * 100) / 100,
      profitFull: Math.round(profitFull * 100) / 100,
      profitPromo: Math.round(profitPromo * 100) / 100,
      receivedFull: Math.round(receivedFull * 100) / 100,
      receivedPromo: Math.round(receivedPromo * 100) / 100,
    };
  }, [computed]);

  const goal = Math.max(0, Number(margin.monthlySalesGoal) || 0);
  const goalPct = goal > 0 ? Math.min(999, (monthSales / goal) * 100) : 0;

  const canInstallments =
    currentMethod?.kind === "credit_card" ||
    currentMethod?.kind === "mp_balance";

  async function save(e?: FormEvent) {
    e?.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/finance/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ margin }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Falha ao salvar");
      return;
    }
    setMargin(json.margin);
    setGoalText(formatBRLInput(Number(json.margin?.monthlySalesGoal) || 0));
    onSaved(json.margin, json.costs?.taxPercent ?? simplesPct);
    setMsg("Meta, taxas, custos e marketing salvos.");
  }

  function addFixedCost() {
    setMargin((m) => ({
      ...m,
      fixedCosts: [
        ...m.fixedCosts,
        { id: newFixedCostId(), name: "", amountMonthly: 0 },
      ],
    }));
  }

  function addMarketingCost() {
    setMargin((m) => ({
      ...m,
      marketingCosts: [
        ...(m.marketingCosts ?? []),
        { id: newMarketingCostId(), name: "", amountMonthly: 0 },
      ],
    }));
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#7a7168] px-0.5 pb-1">
        Expanda só o que for editar (+ / −). A simulação e os resultados ficam
        abertos por padrão.
      </p>

      <form onSubmit={save} className="space-y-2">
        <FinanceCollapse
          title={`Meta de vendas · ${monthLabel}`}
          defaultOpen={false}
          summary={
            goal > 0
              ? `${formatBRL(monthSales)} de ${formatBRL(goal)} (${goalPct.toFixed(0)}%)`
              : `${formatBRL(monthSales)} realizado · sem meta`
          }
          className="!border-[#c9a24a]/40"
        >
          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <label className="block text-xs text-[#5c534c]">
              Meta de faturamento do mês (R$)
              <input
                type="text"
                inputMode="decimal"
                className="input mt-1"
                value={goalText}
                placeholder="Ex.: 10.000 ou 10000"
                onChange={(e) => {
                  const raw = e.target.value;
                  setGoalText(raw);
                  setMargin((m) => ({
                    ...m,
                    monthlySalesGoal: parseBRLMoney(raw),
                  }));
                }}
                onBlur={() => {
                  const n = parseBRLMoney(goalText);
                  setMargin((m) => ({ ...m, monthlySalesGoal: n }));
                  setGoalText(formatBRLInput(n));
                }}
              />
              <span className="mt-1 block text-[11px] text-[#7a7168]">
                Use ponto como milhar (10.000) ou só números (10000). Valor
                salvo: {formatBRL(goal)}
              </span>
            </label>
            <div className="text-sm text-[#2a2420]">
              <p>
                Realizado: <strong>{formatBRL(monthSales)}</strong>
                {goal > 0 ? (
                  <>
                    {" "}
                    de <strong>{formatBRL(goal)}</strong> (
                    {goalPct.toFixed(0)}%)
                  </>
                ) : (
                  <span className="text-[#7a7168]"> · cadastre a meta</span>
                )}
              </p>
              {goal > 0 ? (
                <div className="mt-2 h-2 bg-black/10 overflow-hidden">
                  <div
                    className={`h-full ${
                      goalPct >= 100 ? "bg-emerald-600" : "bg-[#c9a24a]"
                    }`}
                    style={{ width: `${Math.min(100, goalPct)}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </FinanceCollapse>

        <FinanceCollapse
          title="Taxas por gateway (banco)"
          defaultOpen={false}
          summary={`${gateway.name} · ${gateway.methods.length} meios`}
        >
          <FinanceGatewayFeesEditor margin={margin} setMargin={setMargin} />
        </FinanceCollapse>

        <FinanceCollapse
          title="Simples Nacional"
          defaultOpen={false}
          summary={`DAS efetivo ${simplesPct.toFixed(2).replace(".", ",")}%`}
        >
          <label className="block text-xs text-[#5c534c]">
            Faixa pela receita bruta em 12 meses
            <select
              className="input mt-1"
              value={margin.simplesBracketId}
              onChange={(e) =>
                setMargin((m) => ({
                  ...m,
                  simplesBracketId: e.target.value,
                }))
              }
            >
              {SIMPLES_BRACKETS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label} · {b.aliquot.toFixed(2).replace(".", ",")}% −
                  deduzir {formatBRL(b.deduct)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[#5c534c]">
            Receita bruta estimada 12 meses (R$)
            <input
              type="number"
              min={0}
              step={1000}
              className="input mt-1"
              value={margin.revenue12m}
              onChange={(e) =>
                setMargin((m) => ({
                  ...m,
                  revenue12m: Number(e.target.value) || 0,
                }))
              }
            />
          </label>
          <div className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Alíquota efetiva do DAS:{" "}
            <strong>{simplesPct.toFixed(2).replace(".", ",")}%</strong>
          </div>
        </FinanceCollapse>

        <FinanceCollapse
          title="Custos fixos mensais"
          defaultOpen={false}
          summary={`${margin.fixedCosts.length} itens · ${formatBRL(fixedMonthly)}/mês · ${formatBRL(fixedUnit)}/un.`}
          actions={
            <button
              type="button"
              className="btn btn-outline !py-1 !px-2 text-[11px]"
              onClick={addFixedCost}
            >
              + Custo
            </button>
          }
        >
          {margin.fixedCosts.length === 0 ? (
            <p className="text-sm text-muted">Nenhum custo fixo cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {margin.fixedCosts.map((fc, idx) => (
                <li key={fc.id} className="flex flex-wrap gap-2 items-end">
                  <label className="flex-1 min-w-[160px] text-xs text-[#5c534c]">
                    Descrição
                    <input
                      className="input mt-1"
                      value={fc.name}
                      placeholder="Ex.: Aluguel"
                      onChange={(e) => {
                        const name = e.target.value;
                        setMargin((m) => {
                          const next = [...m.fixedCosts];
                          next[idx] = { ...next[idx], name };
                          return { ...m, fixedCosts: next };
                        });
                      }}
                    />
                  </label>
                  <label className="w-36 text-xs text-[#5c534c]">
                    R$ / mês
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="input mt-1"
                      value={fc.amountMonthly}
                      onChange={(e) => {
                        const amountMonthly = Number(e.target.value) || 0;
                        setMargin((m) => {
                          const next = [...m.fixedCosts];
                          next[idx] = { ...next[idx], amountMonthly };
                          return { ...m, fixedCosts: next };
                        });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs text-rose-700 mb-2"
                    onClick={() =>
                      setMargin((m) => ({
                        ...m,
                        fixedCosts: m.fixedCosts.filter((x) => x.id !== fc.id),
                      }))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-[#2a2420]">
            Total fixo/mês: <strong>{formatBRL(fixedMonthly)}</strong>
            {" · "}
            Rateio/unidade: <strong>{formatBRL(fixedUnit)}</strong>
          </p>
        </FinanceCollapse>

        <FinanceCollapse
          title="Investimento em marketing"
          defaultOpen={false}
          summary={`${(margin.marketingCosts ?? []).length} itens · ${formatBRL(marketingMonthly)}/mês · ${formatBRL(marketingUnit)}/un.`}
          actions={
            <button
              type="button"
              className="btn btn-outline !py-1 !px-2 text-[11px]"
              onClick={addMarketingCost}
            >
              + Gasto
            </button>
          }
        >
          <p className="text-xs text-[#7a7168]">
            Tráfego, filmagens, creators — rateado por unidade como o custo
            fixo.
          </p>
          {(margin.marketingCosts ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum investimento em marketing cadastrado.
            </p>
          ) : (
            <ul className="space-y-2">
              {(margin.marketingCosts ?? []).map((mk, idx) => (
                <li key={mk.id} className="flex flex-wrap gap-2 items-end">
                  <label className="flex-1 min-w-[160px] text-xs text-[#5c534c]">
                    Descrição
                    <input
                      className="input mt-1"
                      value={mk.name}
                      placeholder="Ex.: Meta Ads"
                      onChange={(e) => {
                        const name = e.target.value;
                        setMargin((m) => {
                          const next = [...(m.marketingCosts ?? [])];
                          next[idx] = { ...next[idx], name };
                          return { ...m, marketingCosts: next };
                        });
                      }}
                    />
                  </label>
                  <label className="w-36 text-xs text-[#5c534c]">
                    R$ / mês
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="input mt-1"
                      value={mk.amountMonthly}
                      onChange={(e) => {
                        const amountMonthly = Number(e.target.value) || 0;
                        setMargin((m) => {
                          const next = [...(m.marketingCosts ?? [])];
                          next[idx] = { ...next[idx], amountMonthly };
                          return { ...m, marketingCosts: next };
                        });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs text-rose-700 mb-2"
                    onClick={() =>
                      setMargin((m) => ({
                        ...m,
                        marketingCosts: (m.marketingCosts ?? []).filter(
                          (x) => x.id !== mk.id
                        ),
                      }))
                    }
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-[#2a2420]">
            Total marketing/mês: <strong>{formatBRL(marketingMonthly)}</strong>
            {" · "}
            Rateio/unidade: <strong>{formatBRL(marketingUnit)}</strong>
          </p>
        </FinanceCollapse>

        <FinanceCollapse
          title="Rateio (fixo + marketing)"
          defaultOpen={false}
          summary={`${
            margin.fixedAllocation === "stock"
              ? `Por estoque (${totalStock} un.)`
              : `Por vendas (${margin.expectedMonthlyUnits} un./mês)`
          } · ${formatBRL(fixedUnit + marketingUnit)}/un.`}
        >
          <div className="grid sm:grid-cols-2 gap-3">
            <fieldset className="space-y-1.5 text-sm">
              <legend className="text-xs text-[#5c534c] mb-1">
                Como dividir
              </legend>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={margin.fixedAllocation === "stock"}
                  onChange={() =>
                    setMargin((m) => ({ ...m, fixedAllocation: "stock" }))
                  }
                />
                Estoque atual ({totalStock} un.)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={margin.fixedAllocation === "monthly_sales"}
                  onChange={() =>
                    setMargin((m) => ({
                      ...m,
                      fixedAllocation: "monthly_sales",
                    }))
                  }
                />
                Vendas esperadas no mês
              </label>
            </fieldset>
            {margin.fixedAllocation === "monthly_sales" ? (
              <label className="block text-xs text-[#5c534c]">
                Unidades esperadas / mês
                <input
                  type="number"
                  min={1}
                  className="input mt-1"
                  value={margin.expectedMonthlyUnits}
                  onChange={(e) =>
                    setMargin((m) => ({
                      ...m,
                      expectedMonthlyUnits: Math.max(
                        1,
                        Number(e.target.value) || 1
                      ),
                    }))
                  }
                />
              </label>
            ) : null}
          </div>
          <p className="text-sm text-[#2a2420]">
            Fixo + marketing / un.:{" "}
            <strong>{formatBRL(fixedUnit + marketingUnit)}</strong>
          </p>
        </FinanceCollapse>

        {error ? <p className="text-sm text-rose-700 px-1">{error}</p> : null}
        {msg ? (
          <p className="text-sm text-emerald-800 px-1">{msg}</p>
        ) : null}

        <div className="pt-1">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Salvando…" : "Salvar meta, taxas e custos"}
          </button>
        </div>
      </form>

      <FinanceCollapse
        title={`Simular pagamento · ${gateway.name}`}
        defaultOpen
        summary={`${currentMethod?.label || "—"} · ${settlementLabel(effectiveSettlement)} · ${installments}x · taxa ${resolvedFee.totalPercent.toFixed(2).replace(".", ",")}%`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-[#2a2420]">
            Taxa efetiva:{" "}
            <strong>
              {resolvedFee.totalPercent.toFixed(2).replace(".", ",")}%
            </strong>
            {resolvedFee.fixedAmount > 0
              ? ` + ${formatBRL(resolvedFee.fixedAmount)}`
              : ""}
            {resolvedFee.installmentSurcharge > 0 ? (
              <span className="text-xs text-[#7a7168]">
                {" "}
                (base {resolvedFee.basePercent.toFixed(2).replace(".", ",")}% +
                parcelamento{" "}
                {resolvedFee.installmentSurcharge
                  .toFixed(2)
                  .replace(".", ",")}
                %)
              </span>
            ) : null}
          </p>
          <label className="text-xs text-[#5c534c]">
            Buscar produto
            <input
              className="input mt-1 w-56"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nome do produto…"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468] mb-1.5">
              Meio de pagamento
            </p>
            <div className="flex flex-wrap gap-2">
              {gateway.methods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMethodId(m.id);
                    if (m.kind !== "credit_card" && m.kind !== "mp_balance") {
                      setInstallments(1);
                    }
                  }}
                  className={`px-3 py-2 text-xs border text-left max-w-[220px] ${
                    currentMethod?.id === m.id
                      ? "bg-[#2a2420] text-white border-[#2a2420]"
                      : "bg-white border-black/15 text-[#3a322c]"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468] mb-1.5">
              Dinheiro disponível
            </p>
            <div className="flex flex-wrap gap-2">
              {SETTLEMENTS.filter((t) =>
                currentMethod?.settlements.some((s) => s.timing === t)
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={margin.promoPreferInstant && t !== "instant"}
                  onClick={() => setSettlement(t)}
                  className={`px-3 py-2 text-xs uppercase tracking-wider border ${
                    effectiveSettlement === t
                      ? "bg-[#2a2420] text-white border-[#2a2420]"
                      : "bg-white border-black/15 text-[#3a322c]"
                  } disabled:opacity-40`}
                >
                  {settlementLabel(t)}
                </button>
              ))}
            </div>
            <label className="mt-3 flex items-start gap-2 text-xs text-[#5c534c] cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={margin.promoPreferInstant}
                onChange={(e) =>
                  setMargin((m) => ({
                    ...m,
                    promoPreferInstant: e.target.checked,
                  }))
                }
              />
              <span>
                Na análise com promoção, forçar recebimento{" "}
                <strong>na hora</strong>
              </span>
            </label>
          </div>
        </div>

        {canInstallments && gateway.sellerInstallments.enabled ? (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468] mb-1.5">
              Parcelamento sem juros
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setInstallments(n)}
                  className={`min-w-[2.5rem] px-2 py-2 text-xs border ${
                    installments === n
                      ? "bg-[#a85f64] text-white border-[#a85f64]"
                      : "bg-white border-black/15 text-[#3a322c]"
                  }`}
                >
                  {n === 1 ? "1x" : `${n}x`}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {analysisPromo ? (
          <div className="space-y-1">
            <p className="text-xs text-[#a85f64]">
              Promoção na análise:{" "}
              <strong>
                {analysisPromo.label} (−{analysisPromo.percent}%)
              </strong>
            </p>
            {!promoAppliesAtCheckout ? (
              <p className="text-[11px] text-amber-900/90">
                No checkout esta promoção não vale em {installments}x — aqui ela
                entra só para comparar lucro com vs sem desconto sob a taxa do
                parcelado.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-[#7a7168]">
            Nenhuma promoção ativa para este meio / parcelas.
          </p>
        )}

        {settlementCompare.length > 1 ? (
          <div className="grid sm:grid-cols-3 gap-2">
            {settlementCompare.map((row) => (
              <button
                key={row.timing}
                type="button"
                onClick={() => setSettlement(row.timing)}
                className={`text-left border p-3 ${
                  effectiveSettlement === row.timing
                    ? "border-[#c9a24a] bg-[#fbf8f0]"
                    : "border-black/8 bg-[#faf7f3]"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
                  {settlementLabel(row.timing)} ·{" "}
                  {row.fee.totalPercent.toFixed(2).replace(".", ",")}%
                </p>
                <p className="text-sm font-semibold tabular-nums mt-1">
                  {formatBRL(row.profitFull)}
                </p>
                <p className="text-[11px] text-[#7a7168]">
                  c/ promo {formatBRL(row.profitPromo)}
                </p>
              </button>
            ))}
          </div>
        ) : null}
      </FinanceCollapse>

      <FinanceCollapse
        title="Resultados do estoque"
        defaultOpen
        summary={`Lucro ${formatBRL(totals.profitFull)} · c/ promo ${formatBRL(totals.profitPromo)} · ${totals.stockUnits} un.`}
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="border border-black/8 bg-[#faf7f3] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              Unidades
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {totals.stockUnits}
            </p>
          </div>
          <div className="border border-black/8 bg-[#faf7f3] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              Venda sem promo
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatBRL(totals.saleFull)}
            </p>
          </div>
          <div className="border border-black/8 bg-[#faf7f3] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              Venda com promo
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {formatBRL(totals.salePromo)}
            </p>
          </div>
          <div className="border border-black/8 bg-[#faf7f3] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              Lucro sem promo
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                totals.profitFull >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {formatBRL(totals.profitFull)}
            </p>
          </div>
          <div className="border border-[#a85f64]/30 bg-[#a85f64]/06 p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a4a4f]">
              Lucro com promo
            </p>
            <p
              className={`text-lg font-semibold tabular-nums ${
                totals.profitPromo >= 0 ? "text-emerald-800" : "text-rose-800"
              }`}
            >
              {formatBRL(totals.profitPromo)}
            </p>
          </div>
          <div className="border border-black/8 bg-[#faf7f3] p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
              Diferença (promo)
            </p>
            <p className="text-lg font-semibold tabular-nums text-amber-900">
              {formatBRL(totals.profitPromo - totals.profitFull)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-black/8">
          <table className="w-full text-left text-xs min-w-[1100px]">
            <thead className="bg-[#faf7f3] text-[10px] uppercase tracking-wider text-[#8a7468]">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Produto</th>
                <th className="px-3 py-2.5 font-semibold text-right">Est.</th>
                <th className="px-3 py-2.5 font-semibold text-right">Preço</th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  Venda c/ promo
                </th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  Lucro un. sem
                </th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  Lucro un. c/
                </th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  Lucro est. sem
                </th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  Lucro est. c/
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">
                    Nenhum item em estoque para simular.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-black/6">
                    <td className="px-3 py-2 text-[#2a2420] max-w-[220px]">
                      <span className="line-clamp-2">{r.label}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.stock}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatBRL(r.full.sale)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatBRL(r.withPromo.sale)}
                      {promoPercent > 0 ? (
                        <span className="block text-[10px] text-[#a85f64]">
                          −{promoPercent}%
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        r.full.profit >= 0
                          ? "text-emerald-800"
                          : "text-rose-800"
                      }`}
                    >
                      {formatBRL(r.full.profit)}
                      <span className="block text-[10px] text-[#8a7468]">
                        {r.full.profitPct.toFixed(1)}%
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-medium ${
                        r.withPromo.profit >= 0
                          ? "text-emerald-800"
                          : "text-rose-800"
                      }`}
                    >
                      {formatBRL(r.withPromo.profit)}
                      <span className="block text-[10px] text-[#8a7468]">
                        {r.withPromo.profitPct.toFixed(1)}%
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        r.stockProfitFull >= 0
                          ? "text-emerald-800"
                          : "text-rose-800"
                      }`}
                    >
                      {formatBRL(r.stockProfitFull)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums font-semibold ${
                        r.stockProfitPromo >= 0
                          ? "text-emerald-800"
                          : "text-rose-800"
                      }`}
                    >
                      {formatBRL(r.stockProfitPromo)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FinanceCollapse>
    </div>
  );
}
