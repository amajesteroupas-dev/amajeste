"use client";

import Link from "next/link";
import { formatBRL } from "@/lib/utils";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { useSitePromo } from "@/components/store/SitePromoContext";
import { promoPrice } from "@/lib/promotion-pricing";
import { fillPaymentCopy } from "@/lib/payment-copy";
import { defaultPayment } from "@/lib/site";

export type PaymentOfferProps = {
  price: number;
  installmentsMax?: number;
  interestFree?: boolean;
  pixDiscountPercent?: number;
  showCardFlags?: boolean;
};

export function PaymentOffer({
  price,
  installmentsMax = 2,
  interestFree = true,
  pixDiscountPercent = 5,
  showCardFlags = true,
}: PaymentOfferProps) {
  const sitePromo = useSitePromo();
  const copy = sitePromo.paymentCopy;

  const hasSiteWide = sitePromo.active && sitePromo.percent > 0;
  const promoSalePrice = hasSiteWide
    ? promoPrice(price, sitePromo.percent)
    : price;

  const max = Math.max(
    1,
    hasSiteWide && sitePromo.interestFreeInstallments
      ? sitePromo.interestFreeInstallments
      : installmentsMax
  );
  const installment = promoSalePrice / max;

  const pixPercent =
    sitePromo.pixOfferPercent > 0
      ? sitePromo.pixOfferPercent
      : pixDiscountPercent;
  const pixPrice = promoPrice(price, pixPercent);
  const priceLabel = formatBRL(pixPrice);

  const hasCard1x =
    sitePromo.card1xOfferPercent > 0 &&
    sitePromo.card1xOfferPercent !== sitePromo.pixOfferPercent;
  const card1xPrice = promoPrice(price, sitePromo.card1xOfferPercent);

  return (
    <div className="border border-ink/12 bg-[#faf8f5] px-3 py-2.5 space-y-1.5">
      {max === 1 ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
          1x à vista de {formatBRL(promoSalePrice)}
        </p>
      ) : (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink">
          {max}x de {formatBRL(installment)}
          {interestFree ? " sem juros" : ""}
        </p>
      )}
      {showCardFlags && (
        <PaymentFlagsRow variant="main" showPix size="sm" />
      )}

      {hasSiteWide ? (
        <div className="text-xs leading-snug">
          <p className="font-semibold text-ink">
            {fillPaymentCopy(copy.pixHeadlinePromo, {
              percent: sitePromo.percent,
              pixPercent: sitePromo.pixPercentIncluded,
              price: formatBRL(promoSalePrice),
              installments: max,
            })}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {fillPaymentCopy(copy.pixDetailPromo, {
              percent: sitePromo.percent,
              pixPercent: sitePromo.pixPercentIncluded,
              price: formatBRL(promoSalePrice),
              installments: max,
            })}
          </p>
        </div>
      ) : null}

      {!hasSiteWide && pixPercent > 0 ? (
        <div className="text-xs leading-snug">
          <p className="font-semibold text-ink">
            {fillPaymentCopy(copy.pixHeadline, {
              percent: pixPercent,
              pixPercent: defaultPayment.pixDiscountPercent,
              price: priceLabel,
              installments: max,
            })}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {fillPaymentCopy(copy.pixDetail, {
              percent: pixPercent,
              pixPercent: defaultPayment.pixDiscountPercent,
              price: priceLabel,
              installments: max,
            })}
          </p>
        </div>
      ) : null}

      {!hasSiteWide && hasCard1x ? (
        <div className="text-xs leading-snug border-t border-ink/8 pt-1.5 mt-1">
          <p className="font-semibold text-ink">
            {sitePromo.card1xOfferPercent}% de desconto no cartão em 1x
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {formatBRL(card1xPrice)} à vista no cartão
          </p>
        </div>
      ) : null}

      <Link
        href="/meios-de-pagamento"
        className="inline-block text-[10px] uppercase tracking-wider underline underline-offset-2 text-ink/70 hover:text-ink"
      >
        Ver meios de pagamento
      </Link>
    </div>
  );
}
