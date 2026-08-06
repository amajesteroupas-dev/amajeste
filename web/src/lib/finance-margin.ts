/** Planejamento de margem: taxas de pagamento, Simples Nacional e custo fixo. */

export type SimplesBracket = {
  id: string;
  /** Teto da faixa (receita bruta 12 meses) */
  maxRevenue: number;
  /** Alíquota nominal % */
  aliquot: number;
  /** Parcela a deduzir (R$) */
  deduct: number;
  label: string;
};

/** Anexo I — Comércio (valores informados pela loja). */
export const SIMPLES_BRACKETS: SimplesBracket[] = [
  {
    id: "faixa1",
    maxRevenue: 180_000,
    aliquot: 4,
    deduct: 0,
    label: "Até R$ 180.000,00",
  },
  {
    id: "faixa2",
    maxRevenue: 360_000,
    aliquot: 7.3,
    deduct: 5_940,
    label: "De R$ 180.000,01 a R$ 360.000,00",
  },
  {
    id: "faixa3",
    maxRevenue: 720_000,
    aliquot: 9.5,
    deduct: 13_860,
    label: "De R$ 360.000,01 a R$ 720.000,00",
  },
  {
    id: "faixa4",
    maxRevenue: 1_800_000,
    aliquot: 10.7,
    deduct: 22_500,
    label: "De R$ 720.000,01 a R$ 1.800.000,00",
  },
  {
    id: "faixa5",
    maxRevenue: 3_600_000,
    aliquot: 14.3,
    deduct: 87_300,
    label: "De R$ 1.800.000,01 a R$ 3.600.000,00",
  },
  {
    id: "faixa6",
    maxRevenue: 4_800_000,
    aliquot: 19,
    deduct: 378_000,
    label: "De R$ 3.600.000,01 a R$ 4.800.000,00",
  },
];

/** @deprecated Preferir gateways — mantido para compatibilidade. */
export type PaymentFeeSettings = {
  pixPercent: number;
  card1xPercent: number;
  card2xPercent: number;
  card3xPercent: number;
};

export type SettlementTiming = "instant" | "d14" | "d30";

export type PaymentMethodKind =
  | "pix"
  | "credit_card"
  | "mp_balance"
  | "debit"
  | "boleto"
  | "other";

export type MethodSettlementFee = {
  timing: SettlementTiming;
  /** Taxa % sobre a venda */
  percent: number;
  /** Taxa fixa em R$ (ex.: boleto) */
  fixedAmount?: number;
  /** Dias até o dinheiro ficar disponível (informativo) */
  daysAvailable?: number;
};

export type GatewayMethodFee = {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  settlements: MethodSettlementFee[];
};

/** Acréscimo do parcelado vendedor (sem juros para o cliente). */
export type InstallmentSurcharge = {
  maxInstallments: number;
  /** % somado à taxa por venda */
  surchargePercent: number;
};

export type SellerInstallmentSettings = {
  enabled: boolean;
  /**
   * Taxa base % usada no parcelado só se useCreditSettlementAsBase=false
   * (legado / custom). No MP o correto é a taxa do prazo de recebimento.
   */
  baseSalePercent: number;
  /**
   * true = base = taxa do cartão no prazo (na hora / 14 / 30) + acréscimo.
   * false = base fixa (baseSalePercent) + acréscimo — não diferencia prazos.
   */
  useCreditSettlementAsBase: boolean;
  surcharges: InstallmentSurcharge[];
};

export type PaymentGatewayProfile = {
  id: string;
  name: string;
  methods: GatewayMethodFee[];
  sellerInstallments: SellerInstallmentSettings;
};

export type FixedCostItem = {
  id: string;
  name: string;
  /** Valor mensal em R$ */
  amountMonthly: number;
};

/** Investimento em marketing (tráfego, filmagem, etc.) — rateado como o custo fixo. */
export type MarketingCostItem = {
  id: string;
  name: string;
  /** Valor gasto / mês em R$ */
  amountMonthly: number;
};

export type FixedCostAllocation = "stock" | "monthly_sales";

export type FinanceMarginSettings = {
  fees: PaymentFeeSettings;
  simplesBracketId: string;
  /** Receita bruta estimada 12 meses — para alíquota efetiva */
  revenue12m: number;
  fixedCosts: FixedCostItem[];
  marketingCosts: MarketingCostItem[];
  /** Como ratear custo fixo e marketing por unidade */
  fixedAllocation: FixedCostAllocation;
  /** Vendas/unidades esperadas no mês (quando allocation = monthly_sales) */
  expectedMonthlyUnits: number;
  /** Meta de faturamento (R$) do mês corrente */
  monthlySalesGoal: number;
  /** Gateways (Mercado Pago, PagBank, etc.) */
  gateways: PaymentGatewayProfile[];
  activeGatewayId: string;
  /** Preferência salva: analisar promoções com recebimento na hora */
  promoPreferInstant: boolean;
};

function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function defaultPaymentFees(): PaymentFeeSettings {
  return {
    pixPercent: 0.99,
    card1xPercent: 4.98,
    card2xPercent: 7.51,
    card3xPercent: 9.6,
  };
}

/** Tabela oficial informada: acréscimo do parcelado vendedor MP (soma à taxa do prazo). */
export const MP_SELLER_INSTALLMENT_SURCHARGES: InstallmentSurcharge[] = [
  { maxInstallments: 2, surchargePercent: 4.52 },
  { maxInstallments: 3, surchargePercent: 6.61 },
  { maxInstallments: 4, surchargePercent: 8.68 },
  { maxInstallments: 5, surchargePercent: 10.65 },
  { maxInstallments: 6, surchargePercent: 11.95 },
  { maxInstallments: 7, surchargePercent: 13.13 },
  { maxInstallments: 8, surchargePercent: 14.39 },
  { maxInstallments: 9, surchargePercent: 15.62 },
  { maxInstallments: 10, surchargePercent: 16.82 },
  { maxInstallments: 11, surchargePercent: 18.01 },
  { maxInstallments: 12, surchargePercent: 19.17 },
];

export function mercadoPagoPreset(): PaymentGatewayProfile {
  return {
    id: "gw_mercadopago",
    name: "Mercado Pago",
    methods: [
      {
        id: "mp_pix",
        kind: "pix",
        label: "Pix",
        settlements: [
          { timing: "instant", percent: 0.99, daysAvailable: 0 },
        ],
      },
      {
        id: "mp_credit",
        kind: "credit_card",
        label: "Cartão de crédito / Cartão Mercado Pago",
        settlements: [
          { timing: "instant", percent: 4.98, daysAvailable: 0 },
          { timing: "d14", percent: 4.49, daysAvailable: 14 },
          { timing: "d30", percent: 3.98, daysAvailable: 30 },
        ],
      },
      {
        id: "mp_balance",
        kind: "mp_balance",
        label: "Saldo Mercado Pago / Linha de Crédito",
        settlements: [
          { timing: "instant", percent: 4.99, daysAvailable: 0 },
          { timing: "d14", percent: 4.49, daysAvailable: 14 },
          { timing: "d30", percent: 3.99, daysAvailable: 30 },
        ],
      },
      {
        id: "mp_debit_caixa",
        kind: "debit",
        label: "Cartão de débito virtual Caixa",
        settlements: [
          { timing: "instant", percent: 3.99, daysAvailable: 0 },
        ],
      },
      {
        id: "mp_boleto",
        kind: "boleto",
        label: "Boleto",
        settlements: [
          {
            timing: "instant",
            percent: 0,
            fixedAmount: 3.49,
            daysAvailable: 3,
          },
        ],
      },
    ],
    sellerInstallments: {
      enabled: true,
      baseSalePercent: 2.99,
      /** MP: taxa do prazo (na hora/14/30) + acréscimo das parcelas */
      useCreditSettlementAsBase: true,
      surcharges: MP_SELLER_INSTALLMENT_SURCHARGES.map((s) => ({ ...s })),
    },
  };
}

/** Template vazio para PagBank / outro banco — preencher as taxas no painel. */
export function emptyGatewayPreset(name: string, id?: string): PaymentGatewayProfile {
  return {
    id: id || `gw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    methods: [
      {
        id: `m_pix_${Math.random().toString(36).slice(2, 6)}`,
        kind: "pix",
        label: "Pix",
        settlements: [{ timing: "instant", percent: 0, daysAvailable: 0 }],
      },
      {
        id: `m_cc_${Math.random().toString(36).slice(2, 6)}`,
        kind: "credit_card",
        label: "Cartão de crédito",
        settlements: [
          { timing: "instant", percent: 0, daysAvailable: 0 },
          { timing: "d14", percent: 0, daysAvailable: 14 },
          { timing: "d30", percent: 0, daysAvailable: 30 },
        ],
      },
    ],
    sellerInstallments: {
      enabled: true,
      baseSalePercent: 0,
      useCreditSettlementAsBase: true,
      surcharges: Array.from({ length: 11 }, (_, i) => ({
        maxInstallments: i + 2,
        surchargePercent: 0,
      })),
    },
  };
}

export function defaultMarginSettings(): FinanceMarginSettings {
  const mp = mercadoPagoPreset();
  return {
    fees: defaultPaymentFees(),
    simplesBracketId: "faixa1",
    revenue12m: 180_000,
    fixedCosts: [],
    marketingCosts: [],
    fixedAllocation: "stock",
    expectedMonthlyUnits: 50,
    monthlySalesGoal: 0,
    gateways: [mp],
    activeGatewayId: mp.id,
    promoPreferInstant: false,
  };
}

export function getSimplesBracket(id: string): SimplesBracket {
  return (
    SIMPLES_BRACKETS.find((b) => b.id === id) || SIMPLES_BRACKETS[0]
  );
}

/**
 * Alíquota efetiva do DAS:
 * (R × alíquota − parcela a deduzir) / R
 */
export function effectiveSimplesPercent(
  bracketId: string,
  revenue12m: number
): number {
  const b = getSimplesBracket(bracketId);
  const R = Math.max(1, Number(revenue12m) || b.maxRevenue);
  const effective = (R * (b.aliquot / 100) - b.deduct) / R;
  return roundMoney(Math.max(0, effective * 100));
}

export function monthlyFixedTotal(items: FixedCostItem[]): number {
  return roundMoney(
    items.reduce((s, i) => s + (Number(i.amountMonthly) || 0), 0)
  );
}

export function monthlyMarketingTotal(items: MarketingCostItem[]): number {
  return roundMoney(
    items.reduce((s, i) => s + (Number(i.amountMonthly) || 0), 0)
  );
}

function allocateMonthlyTotal(
  total: number,
  allocation: FixedCostAllocation,
  totalStockUnits: number,
  expectedMonthlyUnits: number
): number {
  if (total <= 0) return 0;
  const divisor =
    allocation === "monthly_sales"
      ? Math.max(1, Number(expectedMonthlyUnits) || 1)
      : Math.max(1, Number(totalStockUnits) || 1);
  return roundMoney(total / divisor);
}

export function fixedCostPerUnit(opts: {
  fixedCosts: FixedCostItem[];
  allocation: FixedCostAllocation;
  totalStockUnits: number;
  expectedMonthlyUnits: number;
}): number {
  return allocateMonthlyTotal(
    monthlyFixedTotal(opts.fixedCosts),
    opts.allocation,
    opts.totalStockUnits,
    opts.expectedMonthlyUnits
  );
}

export function marketingCostPerUnit(opts: {
  marketingCosts: MarketingCostItem[];
  allocation: FixedCostAllocation;
  totalStockUnits: number;
  expectedMonthlyUnits: number;
}): number {
  return allocateMonthlyTotal(
    monthlyMarketingTotal(opts.marketingCosts),
    opts.allocation,
    opts.totalStockUnits,
    opts.expectedMonthlyUnits
  );
}

/** @deprecated Use resolveGatewayFee */
export type PaymentChannel = "pix" | "card1x" | "card2x" | "card3x";

export function feePercentFor(
  fees: PaymentFeeSettings,
  channel: PaymentChannel
): number {
  if (channel === "pix") return Number(fees.pixPercent) || 0;
  if (channel === "card1x") return Number(fees.card1xPercent) || 0;
  if (channel === "card2x") return Number(fees.card2xPercent) || 0;
  return Number(fees.card3xPercent) || 0;
}

export function channelLabel(channel: PaymentChannel): string {
  if (channel === "pix") return "Pix";
  if (channel === "card1x") return "Cartão 1x";
  if (channel === "card2x") return "Cartão 2x s/ juros";
  return "Cartão 3x s/ juros";
}

export function settlementLabel(timing: SettlementTiming): string {
  if (timing === "instant") return "Na hora";
  if (timing === "d14") return "14 dias";
  return "30 dias";
}

export function getActiveGateway(
  margin: FinanceMarginSettings
): PaymentGatewayProfile {
  const list =
    margin.gateways?.length > 0
      ? margin.gateways
      : [mercadoPagoPreset()];
  return (
    list.find((g) => g.id === margin.activeGatewayId) || list[0]
  );
}

function pickSettlement(
  method: GatewayMethodFee,
  timing: SettlementTiming
): MethodSettlementFee | null {
  if (!method.settlements?.length) return null;
  return (
    method.settlements.find((s) => s.timing === timing) ||
    method.settlements.find((s) => s.timing === "instant") ||
    method.settlements[0]
  );
}

export type ResolvedGatewayFee = {
  percent: number;
  fixedAmount: number;
  /** Taxa % efetiva total (base + parcelamento quando aplicável) */
  totalPercent: number;
  basePercent: number;
  installmentSurcharge: number;
  installments: number;
  settlement: SettlementTiming;
  daysAvailable: number;
  methodLabel: string;
  summary: string;
};

/**
 * Resolve taxa efetiva do gateway:
 * - 1x / Pix / débito / boleto: taxa do prazo escolhido
 * - 2x–12x sem juros (parcelado vendedor): taxa do prazo (na hora / 14 / 30)
 *   + acréscimo da tabela de parcelas (modelo Mercado Pago)
 */
export function resolveGatewayFee(opts: {
  gateway: PaymentGatewayProfile;
  methodId: string;
  settlement: SettlementTiming;
  /** 1 = à vista; 2–12 = parcelado sem juros (vendedor) */
  installments: number;
}): ResolvedGatewayFee {
  const gateway = opts.gateway;
  const method =
    gateway.methods.find((m) => m.id === opts.methodId) ||
    gateway.methods[0];
  const installments = Math.max(1, Math.min(12, Math.round(opts.installments) || 1));
  const settlement = opts.settlement;
  const row = method ? pickSettlement(method, settlement) : null;
  const baseFromMethod = Number(row?.percent) || 0;
  const fixedAmount = Number(row?.fixedAmount) || 0;
  const daysAvailable = Number(row?.daysAvailable ?? (
    settlement === "instant" ? 0 : settlement === "d14" ? 14 : 30
  ));

  let basePercent = baseFromMethod;
  let installmentSurcharge = 0;

  const seller = gateway.sellerInstallments;
  const isCardLike =
    method?.kind === "credit_card" || method?.kind === "mp_balance";

  if (installments > 1 && seller?.enabled && isCardLike) {
    // Prazo de recebimento muda a base; o acréscimo depende só do nº de parcelas.
    if (seller.useCreditSettlementAsBase) {
      basePercent = baseFromMethod;
    } else {
      basePercent = Number(seller.baseSalePercent) || 0;
    }
    const sc = seller.surcharges.find(
      (s) => s.maxInstallments === installments
    );
    installmentSurcharge = Number(sc?.surchargePercent) || 0;
  }

  const totalPercent = roundMoney(basePercent + installmentSurcharge);
  const methodLabel = method?.label || "Pagamento";
  const parts = [
    methodLabel,
    installments > 1 ? `${installments}x s/ juros` : "à vista",
    settlementLabel(settlement),
  ];
  if (fixedAmount > 0) {
    parts.push(`+ ${formatFeeFixed(fixedAmount)}`);
  }
  parts.push(`${totalPercent.toFixed(2).replace(".", ",")}%`);

  return {
    percent: totalPercent,
    fixedAmount,
    totalPercent,
    basePercent,
    installmentSurcharge,
    installments,
    settlement,
    daysAvailable,
    methodLabel,
    summary: parts.join(" · "),
  };
}

function formatFeeFixed(n: number) {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Sincroniza o bloco legado `fees` a partir do gateway ativo (atalhos). */
export function syncLegacyFeesFromGateway(
  gateway: PaymentGatewayProfile
): PaymentFeeSettings {
  const pix = gateway.methods.find((m) => m.kind === "pix");
  const credit = gateway.methods.find((m) => m.kind === "credit_card");
  const pixPct = Number(pix?.settlements[0]?.percent) || 0;
  const card1 =
    Number(
      credit?.settlements.find((s) => s.timing === "instant")?.percent
    ) || 0;
  const seller = gateway.sellerInstallments;
  const s2 = seller?.surcharges.find((s) => s.maxInstallments === 2);
  const s3 = seller?.surcharges.find((s) => s.maxInstallments === 3);
  const base = seller?.useCreditSettlementAsBase
    ? card1
    : Number(seller?.baseSalePercent) || 0;
  return {
    pixPercent: pixPct,
    card1xPercent: card1,
    card2xPercent: roundMoney(base + (Number(s2?.surchargePercent) || 0)),
    card3xPercent: roundMoney(base + (Number(s3?.surchargePercent) || 0)),
  };
}

export type UnitMarginBreakdown = {
  sale: number;
  feePercent: number;
  feeFixed: number;
  feeAmount: number;
  /** Valor líquido que entra na conta após taxa do meio de pagamento */
  received: number;
  simplesPercent: number;
  simplesAmount: number;
  merchandise: number;
  packaging: number;
  fixedPerUnit: number;
  marketingPerUnit: number;
  totalCosts: number;
  /** Lucro unitário final */
  profit: number;
  profitPct: number;
};

export function computeUnitMargin(opts: {
  salePrice: number;
  merchandise: number;
  packaging: number;
  feePercent: number;
  feeFixed?: number;
  simplesPercent: number;
  fixedPerUnit: number;
  marketingPerUnit?: number;
}): UnitMarginBreakdown {
  const sale = roundMoney(Number(opts.salePrice) || 0);
  const feePercent = Math.max(0, Number(opts.feePercent) || 0);
  const feeFixed = Math.max(0, Number(opts.feeFixed) || 0);
  const feeAmount = roundMoney(sale * (feePercent / 100) + feeFixed);
  const received = roundMoney(sale - feeAmount);
  const simplesPercent = Math.max(0, Number(opts.simplesPercent) || 0);
  const simplesAmount = roundMoney(sale * (simplesPercent / 100));
  const merchandise = roundMoney(Number(opts.merchandise) || 0);
  const packaging = roundMoney(Number(opts.packaging) || 0);
  const fixedPerUnit = roundMoney(Number(opts.fixedPerUnit) || 0);
  const marketingPerUnit = roundMoney(Number(opts.marketingPerUnit) || 0);
  const totalCosts = roundMoney(
    merchandise +
      packaging +
      fixedPerUnit +
      marketingPerUnit +
      simplesAmount +
      feeAmount
  );
  const profit = roundMoney(sale - totalCosts);
  const profitPct = sale > 0 ? roundMoney((profit / sale) * 100) : 0;
  return {
    sale,
    feePercent,
    feeFixed,
    feeAmount,
    received,
    simplesPercent,
    simplesAmount,
    merchandise,
    packaging,
    fixedPerUnit,
    marketingPerUnit,
    totalCosts,
    profit,
    profitPct,
  };
}

export function newFixedCostId() {
  return `fc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function newMarketingCostId() {
  return `mk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function newGatewayId() {
  return `gw_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function salePriceAfterPromo(listPrice: number, promoPercent: number) {
  const p = Math.max(0, Math.min(90, Number(promoPercent) || 0));
  if (p <= 0) return roundMoney(Number(listPrice) || 0);
  return roundMoney((Number(listPrice) || 0) * (1 - p / 100));
}

/** Contexto de pagamento para promoções do site. */
export function checkoutCtxFromSim(opts: {
  methodKind: PaymentMethodKind;
  installments: number;
}): {
  isPix: boolean;
  isCard: boolean;
  installments: number;
} {
  const isPix = opts.methodKind === "pix";
  const isCard =
    opts.methodKind === "credit_card" ||
    opts.methodKind === "mp_balance" ||
    opts.methodKind === "debit";
  return {
    isPix,
    isCard,
    installments: Math.max(1, opts.installments || 1),
  };
}

/** Canal de pagamento para relatório financeiro. */
export type SalesPaymentChannel = "pix" | "card" | "other";

export function classifyPaymentChannel(
  method: string | null | undefined
): SalesPaymentChannel {
  const m = String(method || "")
    .trim()
    .toLowerCase();
  if (!m) return "other";
  if (m.includes("pix")) return "pix";
  if (
    m.includes("credit") ||
    m.includes("debit") ||
    m.includes("card") ||
    m === "mercadopago_wallet" ||
    m === "pagseguro" ||
    m === "infinitypay"
  ) {
    return "card";
  }
  return "other";
}

export function salesChannelLabel(channel: SalesPaymentChannel): string {
  if (channel === "pix") return "Pix";
  if (channel === "card") return "Cartão";
  return "Outros";
}

/**
 * Estima taxa do gateway sobre o valor pago (visão geral).
 * Cartão histórico: assume 1x (parcelas não ficam gravadas no Payment).
 */
export function estimatePaymentFeeAmount(opts: {
  gateway: PaymentGatewayProfile;
  method: string | null | undefined;
  amount: number;
  settlement: SettlementTiming;
  installments?: number;
}): {
  channel: SalesPaymentChannel;
  feePercent: number;
  feeFixed: number;
  feeAmount: number;
  received: number;
} {
  const amount = Math.max(0, Number(opts.amount) || 0);
  const channel = classifyPaymentChannel(opts.method);
  const installments = Math.max(1, Math.min(12, opts.installments || 1));

  let methodId = "";
  if (channel === "pix") {
    methodId =
      opts.gateway.methods.find((m) => m.kind === "pix")?.id ||
      opts.gateway.methods[0]?.id ||
      "";
  } else if (channel === "card") {
    methodId =
      opts.gateway.methods.find((m) => m.kind === "credit_card")?.id ||
      opts.gateway.methods.find((m) => m.kind === "mp_balance")?.id ||
      opts.gateway.methods[0]?.id ||
      "";
  }

  if (!methodId || channel === "other") {
    return {
      channel,
      feePercent: 0,
      feeFixed: 0,
      feeAmount: 0,
      received: roundMoney(amount),
    };
  }

  const fee = resolveGatewayFee({
    gateway: opts.gateway,
    methodId,
    settlement: channel === "pix" ? "instant" : opts.settlement,
    installments: channel === "card" ? installments : 1,
  });
  const feeAmount = roundMoney(
    amount * (fee.totalPercent / 100) + fee.fixedAmount
  );
  return {
    channel,
    feePercent: fee.totalPercent,
    feeFixed: fee.fixedAmount,
    feeAmount,
    received: roundMoney(amount - feeAmount),
  };
}

export type SalesChannelReport = {
  channel: SalesPaymentChannel;
  label: string;
  orders: number;
  sales: number;
  feePercent: number;
  feeAmount: number;
  received: number;
  cogs: number;
  tax: number;
  /** Lucro do canal: venda − taxa − CMV − imposto */
  profit: number;
};

/** @deprecated */
export function checkoutCtxFromChannel(channel: PaymentChannel): {
  isPix: boolean;
  isCard: boolean;
  installments: number;
} {
  if (channel === "pix") {
    return { isPix: true, isCard: false, installments: 1 };
  }
  return {
    isPix: false,
    isCard: true,
    installments: channel === "card1x" ? 1 : channel === "card2x" ? 2 : 3,
  };
}
