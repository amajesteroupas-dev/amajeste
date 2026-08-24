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
  pixDiscountPercent = 5,
  showCardFlags = true,
}: PaymentOfferProps) {
  const sitePromo = useSitePromo();
  const copy = sitePromo.paymentCopy;

  const hasSiteWide = sitePromo.active && sitePromo.percent > 0;
  const siteSalePrice = hasSiteWide
    ? promoPrice(price, sitePromo.percent)
    : price;

  const basePixPercent = defaultPayment.pixDiscountPercent || pixDiscountPercent;
  const pixPercent = hasSiteWide
    ? sitePromo.percent
    : sitePromo.pixOfferPercent > 0
      ? sitePromo.pixOfferPercent
      : basePixPercent;
  const pixPrice = hasSiteWide
    ? siteSalePrice
    : promoPrice(price, pixPercent);

  const listLabel = formatBRL(price);
  const pixLabel = formatBRL(pixPrice);

  const headline = hasSiteWide
    ? fillPaymentCopy(copy.pixHeadlinePromo, {
        percent: sitePromo.percent,
        pixPercent: sitePromo.pixPercentIncluded,
        price: pixLabel,
        listPrice: listLabel,
      })
    : fillPaymentCopy(copy.pixHeadline, {
        percent: pixPercent,
        pixPercent,
        price: pixLabel,
        listPrice: listLabel,
      });

  const detail = hasSiteWide
    ? fillPaymentCopy(copy.pixDetailPromo, {
        percent: sitePromo.percent,
        pixPercent: sitePromo.pixPercentIncluded,
        price: pixLabel,
        listPrice: listLabel,
      })
    : fillPaymentCopy(copy.pixDetail, {
        percent: pixPercent,
        pixPercent,
        price: pixLabel,
        listPrice: listLabel,
      });

  return (
    <div className="border border-ink/12 bg-[#faf8f5] px-3 py-2.5 space-y-1.5">
      <div className="space-y-0.5">
        <p className="text-[11px] text-muted tabular-nums">{listLabel}</p>
        {headline ? (
          <p className="text-[11px] font-semibold leading-snug text-ink">
            {headline}
          </p>
        ) : null}
        {detail ? (
          <p className="text-[11px] leading-snug text-[#6b5f56]">{detail}</p>
        ) : null}
        <p className="text-sm font-semibold tabular-nums text-ink pt-0.5">
          {pixLabel}
          <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-[#5a7a4a]">
            no Pix
          </span>
        </p>
      </div>

      {showCardFlags ? (
        <PaymentFlagsRow variant="main" showPix size="sm" />
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
