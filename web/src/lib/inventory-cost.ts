/** Custo médio ponderado de estoque (admin / financeiro) */

export function weightedAverageCost(params: {
  oldStock: number;
  oldAvgCost: number;
  addQty: number;
  unitCost: number;
}): number {
  const oldStock = Math.max(0, params.oldStock);
  const addQty = Math.max(0, params.addQty);
  const oldAvg = Number(params.oldAvgCost) || 0;
  const unit = Number(params.unitCost) || 0;

  if (addQty <= 0) return roundMoney(oldAvg);
  if (oldStock <= 0) return roundMoney(unit);

  const total = oldStock * oldAvg + addQty * unit;
  const qty = oldStock + addQty;
  return roundMoney(total / qty);
}

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Custo efetivo da variante: avgCost ou costPrice do produto */
export function effectiveUnitCost(
  avgCost: { toString(): string } | number | string | null | undefined,
  productCost: { toString(): string } | number | string | null | undefined
) {
  const avg = Number(avgCost ?? 0);
  if (avg > 0) return avg;
  return Number(productCost ?? 0);
}

export {
  packagingUnitCost,
  taxOnSalePrice,
  landedUnitCost,
  unitEconomics,
} from "@/lib/finance-settings";
