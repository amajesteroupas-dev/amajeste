import { SiteHeader } from "@/components/store/SiteHeader";
import { SiteFooter } from "@/components/store/SiteFooter";
import { WhatsAppFloat } from "@/components/store/WhatsAppFloat";
import { CookieConsent } from "@/components/store/CookieConsent";
import { LiveMiniPlayerProvider } from "@/components/store/LiveMiniPlayerContext";
import { LiveMiniPlayer } from "@/components/store/LiveMiniPlayer";
import { LiveVideoFloat } from "@/components/store/LiveVideoFloat";
import { PwaEntrySplash } from "@/components/store/PwaEntrySplash";
import { SitePromoProvider } from "@/components/store/SitePromoContext";
import { SiteVisitTracker } from "@/components/store/SiteVisitTracker";
import { CartAbandonTracker } from "@/components/store/CartAbandonTracker";
import { MetaPixel } from "@/components/store/MetaPixel";
import { getActiveStories, getGlobalStoriesSurvey } from "@/lib/stories";
import {
  getActiveSitePromotion,
  getLivePromotions,
  pickBestPromotion,
} from "@/lib/promotion-settings";
import { getPaymentCopySettings } from "@/lib/payment-copy-settings";
import { getMetaPixelSettings } from "@/lib/traffic-attribution-server";

export const dynamic = "force-dynamic";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stories, surveyQuestions, promo, paymentCopy, promotions, metaPixel] =
    await Promise.all([
      getActiveStories(),
      getGlobalStoriesSurvey(),
      getActiveSitePromotion(),
      getPaymentCopySettings(),
      getLivePromotions(),
      getMetaPixelSettings(),
    ]);

  const pixOffer =
    pickBestPromotion(promotions, {
      isPix: true,
      isCard: false,
      installments: 1,
    })?.percent || 0;
  const card1xOffer =
    pickBestPromotion(promotions, {
      isPix: false,
      isCard: true,
      installments: 1,
    })?.percent || 0;
  const cardOffer =
    pickBestPromotion(promotions, {
      isPix: false,
      isCard: true,
      installments: 2,
    })?.percent || 0;

  return (
    <LiveMiniPlayerProvider>
      <SitePromoProvider
        value={{
          active: promo.active,
          enabled: promo.enabled,
          percent: promo.active ? promo.percent : 0,
          endsAt: promo.endsAt,
          label: promo.label,
          pixPercentIncluded: promo.pixPercentIncluded,
          paymentCopy,
          promotions,
          pixOfferPercent: pixOffer,
          card1xOfferPercent: card1xOffer,
          cardOfferPercent: cardOffer,
          interestFreeInstallments:
            promo.active &&
            promo.cardInstallmentsMax != null &&
            promo.cardInstallmentsMax > 0
              ? promo.cardInstallmentsMax
              : null,
        }}
      >
        <PwaEntrySplash />
        <SiteVisitTracker />
        <CartAbandonTracker />
        <MetaPixel pixelId={metaPixel.pixelId} />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <WhatsAppFloat />
        <LiveVideoFloat stories={stories} surveyQuestions={surveyQuestions} />
        <LiveMiniPlayer />
        <CookieConsent />
      </SitePromoProvider>
    </LiveMiniPlayerProvider>
  );
}
