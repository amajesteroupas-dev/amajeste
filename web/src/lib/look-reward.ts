/** % do cupom gerado ao aprovar look (Influence Majesté). */
export const LOOK_REWARD_PERCENT = 10;

export const COUPON_KIND_LOOK = "LOOK";
export const COUPON_KIND_INFLUENCER = "INFLUENCER";
/** Promoção do site com código (ex.: 20% acima de R$ 199). */
export const COUPON_KIND_PROMO = "PROMO";

/** Sempre a taxa atual do programa Influence (não usa % antigo do registro). */
export function lookRewardPercent(_unused?: number | null) {
  void _unused;
  return LOOK_REWARD_PERCENT;
}

/**
 * % aplicado no checkout.
 * Looks Influence → sempre LOOK_REWARD_PERCENT.
 * Cupons públicos (influencer / promoção) → % cadastrado no painel.
 */
export function resolveCouponPercent(coupon: {
  percent?: number | null;
  kind?: string | null;
  lookPostId?: string | null;
}) {
  const isLook =
    coupon.lookPostId != null ||
    !coupon.kind ||
    coupon.kind === COUPON_KIND_LOOK;
  if (isLook) return lookRewardPercent(coupon.percent);
  const p = Number(coupon.percent);
  if (!Number.isFinite(p) || p <= 0) return LOOK_REWARD_PERCENT;
  return Math.min(90, Math.max(1, Math.round(p * 100) / 100));
}

/** Cupom público multi-uso (influencer Instagram ou promoção do site). */
export function isPublicMultiUseCoupon(coupon: {
  kind?: string | null;
  lookPostId?: string | null;
}) {
  if (coupon.lookPostId) return false;
  return (
    coupon.kind === COUPON_KIND_INFLUENCER ||
    coupon.kind === COUPON_KIND_PROMO
  );
}

/** @deprecated use isPublicMultiUseCoupon */
export function isInfluencerCoupon(coupon: {
  kind?: string | null;
  lookPostId?: string | null;
}) {
  return isPublicMultiUseCoupon(coupon);
}

export function couponKindLabel(kind?: string | null) {
  if (kind === COUPON_KIND_PROMO) return "Promoção";
  if (kind === COUPON_KIND_INFLUENCER) return "Influencer";
  return "Look";
}
