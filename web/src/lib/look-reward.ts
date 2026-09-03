/** % do cupom gerado ao aprovar look (Influence Majesté). */
export const LOOK_REWARD_PERCENT = 10;

export const COUPON_KIND_LOOK = "LOOK";
export const COUPON_KIND_INFLUENCER = "INFLUENCER";

/** Sempre a taxa atual do programa Influence (não usa % antigo do registro). */
export function lookRewardPercent(_unused?: number | null) {
  void _unused;
  return LOOK_REWARD_PERCENT;
}

/**
 * % aplicado no checkout.
 * Looks Influence → sempre LOOK_REWARD_PERCENT.
 * Cupons de influencer Instagram → % cadastrado no painel.
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

export function isInfluencerCoupon(coupon: {
  kind?: string | null;
  lookPostId?: string | null;
}) {
  return (
    coupon.kind === COUPON_KIND_INFLUENCER &&
    (coupon.lookPostId == null || coupon.lookPostId === "")
  );
}
