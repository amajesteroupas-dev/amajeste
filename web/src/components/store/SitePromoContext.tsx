"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  DEFAULT_PAYMENT_COPY,
  type PaymentCopySettings,
} from "@/lib/payment-copy";
import type { SitePromotion } from "@/lib/promotion-pricing";

export type SitePromoValue = {
  /** Há alguma promoção “all” ou melhor oferta genérica para destaque */
  active: boolean;
  enabled: boolean;
  percent: number;
  endsAt: string | null;
  label: string;
  pixPercentIncluded: number;
  paymentCopy: PaymentCopySettings;
  /** Todas as promoções válidas agora */
  promotions: SitePromotion[];
  /** Melhor % Pix (promo pix/all ou 0) */
  pixOfferPercent: number;
  /** Melhor % cartão 1x */
  card1xOfferPercent: number;
  /** Melhor % cartão qualquer parcela */
  cardOfferPercent: number;
  /**
   * Parcelas sem juros da promoção ativa do site (1 = à vista).
   * null = usa o padrão do produto.
   */
  interestFreeInstallments: number | null;
};

const defaultValue: SitePromoValue = {
  active: false,
  enabled: false,
  percent: 0,
  endsAt: null,
  label: "",
  pixPercentIncluded: 5,
  paymentCopy: { ...DEFAULT_PAYMENT_COPY },
  promotions: [],
  pixOfferPercent: 0,
  card1xOfferPercent: 0,
  cardOfferPercent: 0,
  interestFreeInstallments: null,
};

const SitePromoContext = createContext<SitePromoValue>(defaultValue);

export function SitePromoProvider({
  value,
  children,
}: {
  value: SitePromoValue;
  children: ReactNode;
}) {
  return (
    <SitePromoContext.Provider value={value}>
      {children}
    </SitePromoContext.Provider>
  );
}

export function useSitePromo() {
  return useContext(SitePromoContext);
}

export function usePaymentCopy() {
  return useContext(SitePromoContext).paymentCopy;
}
