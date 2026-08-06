import { NextResponse } from "next/server";
import {
  getActiveSitePromotion,
  getLivePromotions,
  pickBestPromotion,
} from "@/lib/promotion-settings";

export const dynamic = "force-dynamic";

/** Promoções ativas para a loja (público). */
export async function GET() {
  const [promo, promotions] = await Promise.all([
    getActiveSitePromotion(),
    getLivePromotions(),
  ]);
  const pixOffer = pickBestPromotion(promotions, {
    isPix: true,
    isCard: false,
    installments: 1,
  });
  const card1x = pickBestPromotion(promotions, {
    isPix: false,
    isCard: true,
    installments: 1,
  });

  return NextResponse.json({
    active: promo.active,
    enabled: promo.enabled,
    percent: promo.active ? promo.percent : 0,
    endsAt: promo.endsAt,
    label: promo.label,
    pixPercentIncluded: promo.pixPercentIncluded,
    promotions,
    pixOfferPercent: pixOffer?.percent || 0,
    card1xOfferPercent: card1x?.percent || 0,
  });
}
