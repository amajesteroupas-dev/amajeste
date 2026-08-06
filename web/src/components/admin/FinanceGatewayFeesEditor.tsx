"use client";

import {
  emptyGatewayPreset,
  mercadoPagoPreset,
  newGatewayId,
  settlementLabel,
  syncLegacyFeesFromGateway,
  type FinanceMarginSettings,
  type PaymentGatewayProfile,
  type SettlementTiming,
} from "@/lib/finance-margin";
import { formatBRL } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";
import { FinanceCollapse } from "@/components/admin/FinanceCollapse";

type Props = {
  margin: FinanceMarginSettings;
  setMargin: Dispatch<SetStateAction<FinanceMarginSettings>>;
};

function updateGateway(
  list: PaymentGatewayProfile[],
  id: string,
  patch: (g: PaymentGatewayProfile) => PaymentGatewayProfile
) {
  return list.map((g) => (g.id === id ? patch(g) : g));
}

export function FinanceGatewayFeesEditor({ margin, setMargin }: Props) {
  const gateways =
    margin.gateways?.length > 0 ? margin.gateways : [mercadoPagoPreset()];
  const activeId = margin.activeGatewayId || gateways[0].id;
  const active = gateways.find((g) => g.id === activeId) || gateways[0];

  function setGateways(next: PaymentGatewayProfile[], nextActive?: string) {
    const prefer = nextActive ?? activeId;
    const resolved =
      next.find((g) => g.id === prefer)?.id || next[0]?.id || "";
    const gw = next.find((g) => g.id === resolved) || next[0];
    setMargin((m) => ({
      ...m,
      gateways: next,
      activeGatewayId: resolved,
      fees: gw ? syncLegacyFeesFromGateway(gw) : m.fees,
    }));
  }

  function addPagBank() {
    const g = emptyGatewayPreset("PagBank");
    setGateways([...gateways, g], g.id);
  }

  function addCustom() {
    const g = emptyGatewayPreset("Novo gateway", newGatewayId());
    setGateways([...gateways, g], g.id);
  }

  function resetMercadoPago() {
    const mp = mercadoPagoPreset();
    const without = gateways.filter((g) => g.id !== "gw_mercadopago");
    setGateways([mp, ...without], mp.id);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline !py-1.5 !px-3 text-xs"
          onClick={resetMercadoPago}
        >
          Restaurar Mercado Pago
        </button>
        <button
          type="button"
          className="btn btn-outline !py-1.5 !px-3 text-xs"
          onClick={addPagBank}
        >
          + PagBank
        </button>
        <button
          type="button"
          className="btn btn-outline !py-1.5 !px-3 text-xs"
          onClick={addCustom}
        >
          + Outro banco
        </button>
      </div>

      <p className="text-xs text-[#7a7168] leading-relaxed">
        Cadastre as taxas de cada adquirente. Expanda só o meio que for editar.
      </p>

      <div className="flex flex-wrap gap-2">
        {gateways.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setGateways(gateways, g.id)}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${
              g.id === active.id
                ? "bg-[#2a2420] text-white border-[#2a2420]"
                : "bg-white border-black/15 text-[#3a322c]"
            }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <label className="block text-xs text-[#5c534c] max-w-md">
        Nome do gateway ativo
        <input
          className="input mt-1"
          value={active.name}
          onChange={(e) => {
            const name = e.target.value;
            setGateways(
              updateGateway(gateways, active.id, (g) => ({ ...g, name }))
            );
          }}
        />
      </label>

      <div className="space-y-1.5">
        {active.methods.map((method, mi) => {
          const summaryParts = method.settlements.map((s) => {
            const pct = `${s.percent.toFixed(2).replace(".", ",")}%`;
            const fix =
              (s.fixedAmount ?? 0) > 0
                ? `+${formatBRL(s.fixedAmount || 0)}`
                : "";
            return `${settlementLabel(s.timing as SettlementTiming)} ${pct}${fix}`;
          });
          return (
            <FinanceCollapse
              key={method.id}
              title={method.label}
              defaultOpen={false}
              summary={summaryParts.join(" · ") || "Sem taxas"}
              className="!border-black/10"
              actions={
                active.methods.length > 1 ? (
                  <button
                    type="button"
                    className="text-[11px] text-rose-700 px-1"
                    onClick={() =>
                      setGateways(
                        updateGateway(gateways, active.id, (g) => ({
                          ...g,
                          methods: g.methods.filter((x) => x.id !== method.id),
                        }))
                      )
                    }
                  >
                    Remover
                  </button>
                ) : undefined
              }
            >
              <label className="block text-xs text-[#5c534c]">
                Nome do meio
                <input
                  className="input mt-1"
                  value={method.label}
                  onChange={(e) => {
                    const label = e.target.value;
                    setGateways(
                      updateGateway(gateways, active.id, (g) => {
                        const methods = [...g.methods];
                        methods[mi] = { ...methods[mi], label };
                        return { ...g, methods };
                      })
                    );
                  }}
                />
              </label>
              <div className="grid sm:grid-cols-3 gap-2">
                {method.settlements.map((st, si) => (
                  <div
                    key={`${method.id}_${st.timing}`}
                    className="bg-[#faf7f3] border border-black/8 p-2 space-y-1.5"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
                      {settlementLabel(st.timing as SettlementTiming)}
                      {st.daysAvailable !== undefined && st.daysAvailable > 0
                        ? ` · ${st.daysAvailable}d`
                        : st.timing === "instant"
                          ? " · imediato"
                          : ""}
                    </p>
                    <label className="block text-[11px] text-[#5c534c]">
                      Taxa %
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="input mt-0.5 !py-1.5 text-sm"
                        value={st.percent}
                        onChange={(e) => {
                          const percent = Number(e.target.value) || 0;
                          setGateways(
                            updateGateway(gateways, active.id, (g) => {
                              const methods = [...g.methods];
                              const settlements = [...methods[mi].settlements];
                              settlements[si] = {
                                ...settlements[si],
                                percent,
                              };
                              methods[mi] = { ...methods[mi], settlements };
                              return { ...g, methods };
                            })
                          );
                        }}
                      />
                    </label>
                    {method.kind === "boleto" || (st.fixedAmount ?? 0) > 0 ? (
                      <label className="block text-[11px] text-[#5c534c]">
                        Taxa fixa (R$)
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="input mt-0.5 !py-1.5 text-sm"
                          value={st.fixedAmount ?? 0}
                          onChange={(e) => {
                            const fixedAmount = Number(e.target.value) || 0;
                            setGateways(
                              updateGateway(gateways, active.id, (g) => {
                                const methods = [...g.methods];
                                const settlements = [
                                  ...methods[mi].settlements,
                                ];
                                settlements[si] = {
                                  ...settlements[si],
                                  fixedAmount,
                                };
                                methods[mi] = {
                                  ...methods[mi],
                                  settlements,
                                };
                                return { ...g, methods };
                              })
                            );
                          }}
                        />
                      </label>
                    ) : null}
                  </div>
                ))}
              </div>
            </FinanceCollapse>
          );
        })}
      </div>

      <FinanceCollapse
        title="Parcelado vendedor (sem juros)"
        defaultOpen={false}
        summary={
          active.sellerInstallments.enabled
            ? `Base ${active.sellerInstallments.baseSalePercent
                .toFixed(2)
                .replace(".", ",")}% + tabela 2x–12x`
            : "Desativado"
        }
        className="!border-[#c9a24a]/35"
        actions={
          <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
            <input
              type="checkbox"
              checked={active.sellerInstallments.enabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setGateways(
                  updateGateway(gateways, active.id, (g) => ({
                    ...g,
                    sellerInstallments: {
                      ...g.sellerInstallments,
                      enabled,
                    },
                  }))
                );
              }}
            />
            Ativo
          </label>
        }
      >
        <p className="text-xs text-[#7a7168]">
          No parcelado sem juros (vendedor), a taxa total é{" "}
          <strong>prazo de recebimento</strong> (na hora / 14 / 30 dias) +{" "}
          <strong>acréscimo</strong> conforme o número de parcelas — como no
          simulador do Mercado Pago.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block text-xs text-[#5c534c]">
            Taxa base fixa no parcelado (%) — só se desmarcar a opção ao lado
            <input
              type="number"
              min={0}
              step={0.01}
              className="input mt-1"
              disabled={active.sellerInstallments.useCreditSettlementAsBase}
              value={active.sellerInstallments.baseSalePercent}
              onChange={(e) => {
                const baseSalePercent = Number(e.target.value) || 0;
                setGateways(
                  updateGateway(gateways, active.id, (g) => ({
                    ...g,
                    sellerInstallments: {
                      ...g.sellerInstallments,
                      baseSalePercent,
                    },
                  }))
                );
              }}
            />
          </label>
          <label className="flex items-start gap-2 text-xs cursor-pointer mt-5">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={active.sellerInstallments.useCreditSettlementAsBase}
              onChange={(e) => {
                const useCreditSettlementAsBase = e.target.checked;
                setGateways(
                  updateGateway(gateways, active.id, (g) => ({
                    ...g,
                    sellerInstallments: {
                      ...g.sellerInstallments,
                      useCreditSettlementAsBase,
                    },
                  }))
                );
              }}
            />
            <span>
              Usar taxa do cartão no prazo (na hora / 14 / 30) como base —{" "}
              <strong>recomendado</strong>
            </span>
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {active.sellerInstallments.surcharges.map((sc, si) => {
            const credit = active.methods.find((m) => m.kind === "credit_card");
            const pct = (timing: "instant" | "d14" | "d30") =>
              Number(
                credit?.settlements.find((s) => s.timing === timing)?.percent
              ) || 0;
            const base = active.sellerInstallments.useCreditSettlementAsBase
              ? null
              : active.sellerInstallments.baseSalePercent;
            return (
              <label
                key={sc.maxInstallments}
                className="block text-[11px] text-[#5c534c] bg-[#faf7f3] border border-black/8 p-2"
              >
                Até {sc.maxInstallments}x · %
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input mt-1 !py-1 text-sm"
                  value={sc.surchargePercent}
                  onChange={(e) => {
                    const surchargePercent = Number(e.target.value) || 0;
                    setGateways(
                      updateGateway(gateways, active.id, (g) => {
                        const surcharges = [...g.sellerInstallments.surcharges];
                        surcharges[si] = {
                          ...surcharges[si],
                          surchargePercent,
                        };
                        return {
                          ...g,
                          sellerInstallments: {
                            ...g.sellerInstallments,
                            surcharges,
                          },
                        };
                      })
                    );
                  }}
                />
                <span className="block mt-1 text-[10px] text-[#8a7468] leading-snug">
                  {base == null ? (
                    <>
                      ≈ hora{" "}
                      {(pct("instant") + sc.surchargePercent)
                        .toFixed(2)
                        .replace(".", ",")}
                      % · 14d{" "}
                      {(pct("d14") + sc.surchargePercent)
                        .toFixed(2)
                        .replace(".", ",")}
                      % · 30d{" "}
                      {(pct("d30") + sc.surchargePercent)
                        .toFixed(2)
                        .replace(".", ",")}
                      %
                    </>
                  ) : (
                    <>
                      ≈{" "}
                      {(base + sc.surchargePercent)
                        .toFixed(2)
                        .replace(".", ",")}
                      %
                    </>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </FinanceCollapse>

      {gateways.length > 1 ? (
        <button
          type="button"
          className="text-xs text-rose-700"
          onClick={() => {
            const next = gateways.filter((g) => g.id !== active.id);
            if (next.length === 0) return;
            setGateways(next, next[0].id);
          }}
        >
          Remover gateway “{active.name}”
        </button>
      ) : null}
    </div>
  );
}
