import { defaultPayment } from "@/lib/site";

/** Campanha legado (migração → lista). */
export const DEFAULT_SITE_PROMO = {
  enabled: true,
  percent: 20,
  endsAt: "2026-08-07T00:00:00-03:00",
  label: "20% OFF em todo o site",
} as const;

export type PromoPaymentScope = "all" | "pix" | "card";

export type SitePromotion = {
  id: string;
  label: string;
  enabled: boolean;
  percent: number;
  /** ISO, ou null = começa imediatamente */
  startsAt: string | null;
  /** ISO, ou null = sem data fim */
  endsAt: string | null;
  /** all = qualquer pagamento | pix | card */
  scope: PromoPaymentScope;
  /**
   * Limite de parcelas do cartão para promoções `all` ou `card`.
   * Se 1, vale apenas à vista (1x). null = qualquer parcelamento.
   */
  cardInstallmentsMax: number | null;
  createdAt: string;
};

/** @deprecated Prefer SitePromotion — mantido para telas antigas */
export type SitePromotionSettings = {
  enabled: boolean;
  percent: number;
  endsAt: string | null;
  label: string;
};

export type ActiveSitePromotion = {
  active: boolean;
  enabled: boolean;
  percent: number;
  startsAt: string | null;
  endsAt: string | null;
  label: string;
  pixPercentIncluded: number;
  scope: PromoPaymentScope;
  cardInstallmentsMax: number | null;
  id: string | null;
};

export type CheckoutPaymentContext = {
  isPix: boolean;
  isCard: boolean;
  /** Parcelas escolhidas no cartão (1 = à vista) */
  installments: number;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export function isPromoLive(promo: SitePromotion, now = new Date()): boolean {
  if (!promo.enabled || promo.percent <= 0) return false;
  const t = now.getTime();
  if (promo.startsAt) {
    const start = new Date(promo.startsAt);
    if (Number.isNaN(start.getTime()) || t < start.getTime()) return false;
  }
  if (promo.endsAt) {
    const end = new Date(promo.endsAt);
    if (Number.isNaN(end.getTime()) || t >= end.getTime()) return false;
  }
  return true;
}

/** Status amigável para o admin (além de currentlyActive). */
export function promoScheduleStatus(
  promo: SitePromotion,
  now = new Date()
): "live" | "scheduled" | "expired" | "disabled" {
  if (!promo.enabled) return "disabled";
  if (promo.percent <= 0) return "disabled";
  const t = now.getTime();
  if (promo.startsAt) {
    const start = new Date(promo.startsAt);
    if (!Number.isNaN(start.getTime()) && t < start.getTime()) return "scheduled";
  }
  if (promo.endsAt) {
    const end = new Date(promo.endsAt);
    if (!Number.isNaN(end.getTime()) && t >= end.getTime()) return "expired";
  }
  return "live";
}

/** @deprecated */
export function isPromotionCurrentlyActive(
  settings: SitePromotionSettings,
  now = new Date()
): boolean {
  return isPromoLive(
    {
      id: "legacy",
      label: settings.label,
      enabled: settings.enabled,
      percent: settings.percent,
      startsAt: null,
      endsAt: settings.endsAt,
      scope: "all",
      cardInstallmentsMax: null,
      createdAt: "",
    },
    now
  );
}

export function promoMatchesPayment(
  promo: SitePromotion,
  ctx: CheckoutPaymentContext
): boolean {
  if (promo.scope === "all") {
    if (
      ctx.isCard &&
      promo.cardInstallmentsMax != null &&
      promo.cardInstallmentsMax > 0 &&
      ctx.installments > promo.cardInstallmentsMax
    ) {
      return false;
    }
    return true;
  }
  if (promo.scope === "pix") return ctx.isPix;
  if (promo.scope === "card") {
    if (!ctx.isCard) return false;
    if (
      promo.cardInstallmentsMax != null &&
      promo.cardInstallmentsMax > 0 &&
      ctx.installments > promo.cardInstallmentsMax
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/** Melhor promoção válida para o pagamento atual (maior %). */
export function pickBestPromotion(
  promos: SitePromotion[],
  ctx: CheckoutPaymentContext,
  now = new Date()
): SitePromotion | null {
  const eligible = promos.filter(
    (p) => isPromoLive(p, now) && promoMatchesPayment(p, ctx)
  );
  if (!eligible.length) return null;
  return eligible.reduce((best, p) =>
    p.percent > best.percent ? p : best
  );
}

export function listLivePromotions(
  promos: SitePromotion[],
  now = new Date()
): SitePromotion[] {
  return promos.filter((p) => isPromoLive(p, now));
}

/**
 * Descontos sobre o subtotal.
 * Promo de site (qualquer escopo) no Pix absorve o 5% base — não soma.
 * Cupom (ex.: look Influence) é exclusivo: não acumula com Pix nem promo do site.
 */
export function computeCheckoutDiscounts(opts: {
  subtotal: number;
  couponPercent?: number | null;
  isPix: boolean;
  isCard?: boolean;
  installments?: number;
  /** Promo resolvida para o pagamento (ou null) */
  matchedPromo?: SitePromotion | null;
  /** @deprecated use matchedPromo */
  sitePromoActive?: boolean;
  /** @deprecated use matchedPromo */
  sitePromoPercent?: number;
  basePixPercent?: number;
}) {
  const sub = Math.max(0, opts.subtotal);
  const basePix = opts.basePixPercent ?? defaultPayment.pixDiscountPercent;
  const hasCoupon = Boolean(opts.couponPercent && opts.couponPercent > 0);

  const matched =
    opts.matchedPromo ??
    (opts.sitePromoActive && (opts.sitePromoPercent || 0) > 0
      ? ({
          id: "legacy",
          label: "",
          enabled: true,
          percent: opts.sitePromoPercent || 0,
          startsAt: null,
          endsAt: null,
          scope: "all" as const,
          cardInstallmentsMax: null,
          createdAt: "",
        } satisfies SitePromotion)
      : null);

  const siteDiscount =
    !hasCoupon && matched && matched.percent > 0
      ? roundMoney(sub * (matched.percent / 100))
      : 0;

  const couponDiscount = hasCoupon
    ? roundMoney(sub * ((opts.couponPercent || 0) / 100))
    : 0;

  const promoCoversPix =
    Boolean(matched) &&
    opts.isPix &&
    (matched!.scope === "all" || matched!.scope === "pix");

  const applyPixExtra =
    opts.isPix && basePix > 0 && !promoCoversPix && !hasCoupon;

  const pixDiscount = applyPixExtra
    ? roundMoney(sub * (basePix / 100))
    : 0;

  return {
    siteDiscount,
    couponDiscount,
    pixDiscount,
    matchedPromo: matched,
    totalDiscount: roundMoney(siteDiscount + couponDiscount + pixDiscount),
  };
}

export function promoPrice(price: number, percent: number) {
  if (percent <= 0) return price;
  return roundMoney(price * (1 - percent / 100));
}

/**
 * Ajuste de preço por categoria.
 * Negativo = desconto (ex: -10 → 10% off). Positivo = acréscimo.
 * Aplicado sobre o preço cadastrado, antes da promoção do site.
 */
export function applyPriceAdjust(
  price: number,
  percent: number | null | undefined
) {
  const p = Number(percent);
  if (!Number.isFinite(price) || !Number.isFinite(p) || p === 0) {
    return roundMoney(price);
  }
  const clamped = Math.max(-90, Math.min(200, p));
  return roundMoney(price * (1 + clamped / 100));
}

export function scopeLabel(scope: PromoPaymentScope): string {
  if (scope === "pix") return "Somente Pix";
  if (scope === "card") return "Somente cartão";
  return "Todo o site (qualquer pagamento)";
}

export function newPromotionId() {
  return `promo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
