import { prisma } from "@/lib/prisma";
import {
  defaultMarginSettings,
  effectiveSimplesPercent,
  mercadoPagoPreset,
  syncLegacyFeesFromGateway,
  type FinanceMarginSettings,
  type FixedCostItem,
  type GatewayMethodFee,
  type InstallmentSurcharge,
  type MarketingCostItem,
  type MethodSettlementFee,
  type PaymentFeeSettings,
  type PaymentGatewayProfile,
  type PaymentMethodKind,
  type SellerInstallmentSettings,
  type SettlementTiming,
} from "@/lib/finance-margin";

export {
  SIMPLES_BRACKETS,
  computeUnitMargin,
  effectiveSimplesPercent,
  feePercentFor,
  fixedCostPerUnit,
  marketingCostPerUnit,
  monthlyFixedTotal,
  monthlyMarketingTotal,
  channelLabel,
  defaultMarginSettings,
  mercadoPagoPreset,
  emptyGatewayPreset,
  resolveGatewayFee,
  getActiveGateway,
  settlementLabel,
  type FinanceMarginSettings,
  type PaymentChannel,
  type PaymentFeeSettings,
  type FixedCostItem,
  type MarketingCostItem,
  type PaymentGatewayProfile,
  type SettlementTiming,
} from "@/lib/finance-margin";

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type FinanceCostSettings = {
  /** Custo fixo por unidade — caixa/embalagem */
  boxCost: number;
  /** Etiqueta */
  labelCost: number;
  /** Sacola */
  bagCost: number;
  /** Outros custos fixos por unidade */
  otherCost: number;
  /**
   * % de imposto estimado sobre o preço de venda
   * (ex.: DAS/Simples aproximado — ajuste no painel)
   */
  taxPercent: number;
};

export type FinanceNfeSettings = {
  enabled: boolean;
  autoEmitOnPaid: boolean;
  /** nuvemfiscal | focus | none */
  provider: "none" | "nuvemfiscal" | "focus";
  apiToken: string;
  /** Ambiente: sandbox | production */
  environment: "sandbox" | "production";
  companyCnpj: string;
  /** ID da empresa no provedor (quando aplicável) */
  companyId: string;
};

export type FinancePrintSettings = {
  enabled: boolean;
  autoOnPaid: boolean;
  /** printnode | queue (agente local) */
  provider: "printnode" | "queue";
  printNodeApiKey: string;
  printNodePrinterId: string;
};

export type FinanceOpsSettings = {
  costs: FinanceCostSettings;
  nfe: FinanceNfeSettings;
  print: FinancePrintSettings;
  margin: FinanceMarginSettings;
};

const KEYS = {
  box: "finCostBox",
  label: "finCostLabel",
  bag: "finCostBag",
  other: "finCostOther",
  tax: "finTaxPercent",
  nfeEnabled: "finNfeEnabled",
  nfeAuto: "finNfeAutoEmit",
  nfeProvider: "finNfeProvider",
  nfeToken: "finNfeToken",
  nfeEnv: "finNfeEnv",
  nfeCnpj: "finNfeCnpj",
  nfeCompanyId: "finNfeCompanyId",
  printEnabled: "finPrintEnabled",
  printAuto: "finPrintAuto",
  printProvider: "finPrintProvider",
  printNodeKey: "finPrintNodeKey",
  printNodePrinter: "finPrintNodePrinterId",
  marginJson: "finMarginJson",
} as const;

async function getMap(keys: string[]) {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

async function upsert(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function num(raw: string | undefined, fallback: number) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function flag(raw: string | undefined, fallback: boolean) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

export function defaultFinanceCosts(): FinanceCostSettings {
  return {
    boxCost: 0,
    labelCost: 0,
    bagCost: 0,
    otherCost: 0,
    taxPercent: 0,
  };
}

function parseSettlement(raw: unknown): MethodSettlementFee | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<MethodSettlementFee>;
  const timing: SettlementTiming =
    s.timing === "d14" || s.timing === "d30" ? s.timing : "instant";
  return {
    timing,
    percent: Math.max(0, Number(s.percent) || 0),
    fixedAmount:
      s.fixedAmount !== undefined
        ? Math.max(0, Number(s.fixedAmount) || 0)
        : undefined,
    daysAvailable:
      s.daysAvailable !== undefined
        ? Math.max(0, Number(s.daysAvailable) || 0)
        : undefined,
  };
}

function parseMethod(raw: unknown): GatewayMethodFee | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Partial<GatewayMethodFee>;
  const kind = (m.kind || "other") as PaymentMethodKind;
  const settlements = Array.isArray(m.settlements)
    ? m.settlements.map(parseSettlement).filter(Boolean) as MethodSettlementFee[]
    : [];
  if (settlements.length === 0) {
    settlements.push({ timing: "instant", percent: 0, daysAvailable: 0 });
  }
  return {
    id: String(m.id || `m_${Math.random().toString(36).slice(2, 8)}`),
    kind,
    label: String(m.label || "Meio").trim() || "Meio",
    settlements,
  };
}

function parseSellerInstallments(
  raw: unknown
): SellerInstallmentSettings {
  const base = mercadoPagoPreset().sellerInstallments;
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<SellerInstallmentSettings>;
  const surcharges: InstallmentSurcharge[] = Array.isArray(s.surcharges)
    ? s.surcharges.map((x) => ({
        maxInstallments: Math.max(
          2,
          Math.min(12, Number(x.maxInstallments) || 2)
        ),
        surchargePercent: Math.max(0, Number(x.surchargePercent) || 0),
      }))
    : base.surcharges;
  return {
    enabled: s.enabled !== false,
    baseSalePercent: Math.max(0, Number(s.baseSalePercent) || 0),
    useCreditSettlementAsBase: Boolean(s.useCreditSettlementAsBase),
    surcharges,
  };
}

function parseGateway(raw: unknown): PaymentGatewayProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<PaymentGatewayProfile>;
  const methods = Array.isArray(g.methods)
    ? (g.methods.map(parseMethod).filter(Boolean) as GatewayMethodFee[])
    : [];
  if (methods.length === 0) return null;
  let sellerInstallments = parseSellerInstallments(g.sellerInstallments);
  const id = String(g.id || `gw_${Math.random().toString(36).slice(2, 8)}`);
  const name = String(g.name || "Gateway").trim() || "Gateway";
  // Preset antigo do MP usava base fixa 2,99% e equalizava na hora/14/30 no parcelado.
  const isMercadoPago =
    id === "gw_mercadopago" || /mercado\s*pago/i.test(name);
  if (isMercadoPago && !sellerInstallments.useCreditSettlementAsBase) {
    sellerInstallments = {
      ...sellerInstallments,
      useCreditSettlementAsBase: true,
    };
  }
  return {
    id,
    name,
    methods,
    sellerInstallments,
  };
}

function parseMargin(raw: string | undefined): FinanceMarginSettings {
  const base = defaultMarginSettings();
  if (!raw?.trim()) return base;
  try {
    const p = JSON.parse(raw) as Partial<FinanceMarginSettings>;
    const fees = p.fees || base.fees;
    const fixedCosts: FixedCostItem[] = Array.isArray(p.fixedCosts)
      ? p.fixedCosts.map((f) => ({
          id: String(f.id || `fc_${Math.random().toString(36).slice(2, 8)}`),
          name: String(f.name || "Custo").trim() || "Custo",
          amountMonthly: Math.max(0, Number(f.amountMonthly) || 0),
        }))
      : [];
    const marketingCosts: MarketingCostItem[] = Array.isArray(p.marketingCosts)
      ? p.marketingCosts.map((f) => ({
          id: String(f.id || `mk_${Math.random().toString(36).slice(2, 8)}`),
          name: String(f.name || "Marketing").trim() || "Marketing",
          amountMonthly: Math.max(0, Number(f.amountMonthly) || 0),
        }))
      : [];

    let gateways: PaymentGatewayProfile[] = Array.isArray(p.gateways)
      ? (p.gateways.map(parseGateway).filter(Boolean) as PaymentGatewayProfile[])
      : [];
    if (gateways.length === 0) {
      gateways = [mercadoPagoPreset()];
    }
    const activeGatewayId =
      gateways.find((g) => g.id === p.activeGatewayId)?.id || gateways[0].id;
    const active = gateways.find((g) => g.id === activeGatewayId)!;
    const syncedFees = syncLegacyFeesFromGateway(active);

    return {
      fees: {
        pixPercent: Math.max(
          0,
          Number(fees.pixPercent ?? syncedFees.pixPercent) || 0
        ),
        card1xPercent: Math.max(
          0,
          Number(fees.card1xPercent ?? syncedFees.card1xPercent) || 0
        ),
        card2xPercent: Math.max(
          0,
          Number(fees.card2xPercent ?? syncedFees.card2xPercent) || 0
        ),
        card3xPercent: Math.max(
          0,
          Number(fees.card3xPercent ?? syncedFees.card3xPercent) || 0
        ),
      },
      simplesBracketId: String(p.simplesBracketId || base.simplesBracketId),
      revenue12m: Math.max(0, Number(p.revenue12m) || base.revenue12m),
      fixedCosts,
      marketingCosts,
      fixedAllocation:
        p.fixedAllocation === "monthly_sales" ? "monthly_sales" : "stock",
      expectedMonthlyUnits: Math.max(
        1,
        Number(p.expectedMonthlyUnits) || base.expectedMonthlyUnits
      ),
      monthlySalesGoal: Math.max(
        0,
        Number(p.monthlySalesGoal) || base.monthlySalesGoal
      ),
      gateways,
      activeGatewayId,
      promoPreferInstant: Boolean(p.promoPreferInstant),
    };
  } catch {
    return base;
  }
}

export async function getFinanceOpsSettings(): Promise<FinanceOpsSettings> {
  const map = await getMap(Object.values(KEYS));
  const providerRaw = (map[KEYS.nfeProvider] || "none").toLowerCase();
  const nfeProvider =
    providerRaw === "nuvemfiscal" || providerRaw === "focus"
      ? providerRaw
      : "none";
  const printProvider =
    (map[KEYS.printProvider] || "queue").toLowerCase() === "printnode"
      ? "printnode"
      : "queue";

  return {
    costs: {
      boxCost: num(map[KEYS.box], 0),
      labelCost: num(map[KEYS.label], 0),
      bagCost: num(map[KEYS.bag], 0),
      otherCost: num(map[KEYS.other], 0),
      taxPercent: num(map[KEYS.tax], 0),
    },
    nfe: {
      enabled: flag(map[KEYS.nfeEnabled], false),
      autoEmitOnPaid: flag(map[KEYS.nfeAuto], false),
      provider: nfeProvider,
      apiToken:
        map[KEYS.nfeToken]?.trim() ||
        process.env.NFE_API_TOKEN?.trim() ||
        "",
      environment:
        (map[KEYS.nfeEnv] || "sandbox").toLowerCase() === "production"
          ? "production"
          : "sandbox",
      companyCnpj: (map[KEYS.nfeCnpj] || "").replace(/\D/g, ""),
      companyId: map[KEYS.nfeCompanyId]?.trim() || "",
    },
    print: {
      enabled: flag(map[KEYS.printEnabled], false),
      autoOnPaid: flag(map[KEYS.printAuto], false),
      provider: printProvider,
      printNodeApiKey:
        map[KEYS.printNodeKey]?.trim() ||
        process.env.PRINTNODE_API_KEY?.trim() ||
        "",
      printNodePrinterId: map[KEYS.printNodePrinter]?.trim() || "",
    },
    margin: parseMargin(map[KEYS.marginJson]),
  };
}

export async function setFinanceOpsSettings(input: {
  costs?: Partial<FinanceCostSettings>;
  nfe?: Partial<FinanceNfeSettings> & { clearToken?: boolean };
  print?: Partial<FinancePrintSettings> & { clearApiKey?: boolean };
  margin?: Partial<FinanceMarginSettings> | FinanceMarginSettings;
}) {
  const ops: Promise<unknown>[] = [];

  if (input.costs) {
    const c = input.costs;
    if (c.boxCost !== undefined) ops.push(upsert(KEYS.box, String(c.boxCost)));
    if (c.labelCost !== undefined)
      ops.push(upsert(KEYS.label, String(c.labelCost)));
    if (c.bagCost !== undefined) ops.push(upsert(KEYS.bag, String(c.bagCost)));
    if (c.otherCost !== undefined)
      ops.push(upsert(KEYS.other, String(c.otherCost)));
    if (c.taxPercent !== undefined)
      ops.push(upsert(KEYS.tax, String(c.taxPercent)));
  }

  if (input.nfe) {
    const n = input.nfe;
    if (n.enabled !== undefined)
      ops.push(upsert(KEYS.nfeEnabled, n.enabled ? "true" : "false"));
    if (n.autoEmitOnPaid !== undefined)
      ops.push(upsert(KEYS.nfeAuto, n.autoEmitOnPaid ? "true" : "false"));
    if (n.provider !== undefined) ops.push(upsert(KEYS.nfeProvider, n.provider));
    if (n.environment !== undefined)
      ops.push(upsert(KEYS.nfeEnv, n.environment));
    if (n.companyCnpj !== undefined)
      ops.push(upsert(KEYS.nfeCnpj, n.companyCnpj.replace(/\D/g, "")));
    if (n.companyId !== undefined)
      ops.push(upsert(KEYS.nfeCompanyId, n.companyId.trim()));
    if (n.clearToken) ops.push(upsert(KEYS.nfeToken, ""));
    else if (n.apiToken?.trim())
      ops.push(upsert(KEYS.nfeToken, n.apiToken.trim()));
  }

  if (input.print) {
    const p = input.print;
    if (p.enabled !== undefined)
      ops.push(upsert(KEYS.printEnabled, p.enabled ? "true" : "false"));
    if (p.autoOnPaid !== undefined)
      ops.push(upsert(KEYS.printAuto, p.autoOnPaid ? "true" : "false"));
    if (p.provider !== undefined)
      ops.push(upsert(KEYS.printProvider, p.provider));
    if (p.printNodePrinterId !== undefined)
      ops.push(upsert(KEYS.printNodePrinter, p.printNodePrinterId.trim()));
    if (p.clearApiKey) ops.push(upsert(KEYS.printNodeKey, ""));
    else if (p.printNodeApiKey?.trim())
      ops.push(upsert(KEYS.printNodeKey, p.printNodeApiKey.trim()));
  }

  if (input.margin) {
    const current = await getFinanceOpsSettings();
    const merged = parseMargin(
      JSON.stringify({ ...current.margin, ...input.margin })
    );
    if (input.margin.fees) {
      merged.fees = {
        ...merged.fees,
        ...input.margin.fees,
      } as PaymentFeeSettings;
    }
    if (input.margin.fixedCosts) {
      merged.fixedCosts = input.margin.fixedCosts;
    }
    if (input.margin.marketingCosts) {
      merged.marketingCosts = input.margin.marketingCosts;
    }
    if (input.margin.gateways) {
      merged.gateways = input.margin.gateways;
    }
    if (input.margin.activeGatewayId) {
      merged.activeGatewayId = input.margin.activeGatewayId;
    }
    if (typeof input.margin.promoPreferInstant === "boolean") {
      merged.promoPreferInstant = input.margin.promoPreferInstant;
    }
    const activeGw =
      merged.gateways.find((g) => g.id === merged.activeGatewayId) ||
      merged.gateways[0];
    if (activeGw) {
      merged.fees = syncLegacyFeesFromGateway(activeGw);
    }
    ops.push(upsert(KEYS.marginJson, JSON.stringify(merged)));
    // Mantém o % de imposto das outras abas alinhado à alíquota efetiva do Simples
    const eff = effectiveSimplesPercent(
      merged.simplesBracketId,
      merged.revenue12m
    );
    ops.push(upsert(KEYS.tax, String(eff)));
  }

  await Promise.all(ops);
  return getFinanceOpsSettings();
}

export function packagingUnitCost(costs: FinanceCostSettings) {
  return roundMoney(
    Number(costs.boxCost || 0) +
      Number(costs.labelCost || 0) +
      Number(costs.bagCost || 0) +
      Number(costs.otherCost || 0)
  );
}

export function taxOnSalePrice(salePrice: number, taxPercent: number) {
  const p = Number(taxPercent) || 0;
  if (p <= 0) return 0;
  return roundMoney((Number(salePrice) || 0) * (p / 100));
}

/** Custo total unitário para CMV ampliado (mercadoria + embalagem). Imposto é separado. */
export function landedUnitCost(merchandiseCost: number, costs: FinanceCostSettings) {
  return roundMoney(Number(merchandiseCost || 0) + packagingUnitCost(costs));
}

export function unitEconomics(params: {
  merchandiseCost: number;
  salePrice: number;
  costs: FinanceCostSettings;
}) {
  const packaging = packagingUnitCost(params.costs);
  const merchandise = roundMoney(Number(params.merchandiseCost) || 0);
  const sale = roundMoney(Number(params.salePrice) || 0);
  const tax = taxOnSalePrice(sale, params.costs.taxPercent);
  const totalCost = roundMoney(merchandise + packaging + tax);
  const margin = roundMoney(sale - totalCost);
  const marginPct = sale > 0 ? roundMoney((margin / sale) * 100) : 0;
  return {
    merchandise,
    packaging,
    box: roundMoney(params.costs.boxCost),
    label: roundMoney(params.costs.labelCost),
    bag: roundMoney(params.costs.bagCost),
    other: roundMoney(params.costs.otherCost),
    tax,
    taxPercent: params.costs.taxPercent,
    totalCost,
    sale,
    margin,
    marginPct,
  };
}

export function maskSecret(value: string) {
  const t = value.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
