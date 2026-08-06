import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAYMENT_COPY,
  type PaymentCopySettings,
} from "@/lib/payment-copy";

export {
  DEFAULT_PAYMENT_COPY,
  fillPaymentCopy,
  isBarePercentCopy,
  resolveProductCardPromoLine,
  type PaymentCopySettings,
  type PaymentCopyVars,
} from "@/lib/payment-copy";

const KEY = "paymentCopyJson";

function sanitizeCopy(
  parsed: Partial<PaymentCopySettings>
): PaymentCopySettings {
  return {
    productCardLine:
      parsed.productCardLine?.trim() || DEFAULT_PAYMENT_COPY.productCardLine,
    // Vazio é intencional: esconde a linha do card na promoção.
    productCardLinePromo: parsed.productCardLinePromo?.trim() ?? "",
    pixHeadline:
      parsed.pixHeadline?.trim() || DEFAULT_PAYMENT_COPY.pixHeadline,
    pixDetail: parsed.pixDetail?.trim() || DEFAULT_PAYMENT_COPY.pixDetail,
    pixHeadlinePromo:
      parsed.pixHeadlinePromo?.trim() ||
      DEFAULT_PAYMENT_COPY.pixHeadlinePromo,
    pixDetailPromo:
      parsed.pixDetailPromo?.trim() || DEFAULT_PAYMENT_COPY.pixDetailPromo,
    footerPaymentLine:
      parsed.footerPaymentLine?.trim() ||
      DEFAULT_PAYMENT_COPY.footerPaymentLine,
  };
}

export async function getPaymentCopySettings(): Promise<PaymentCopySettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: KEY } });
    if (!row?.value?.trim()) return { ...DEFAULT_PAYMENT_COPY };
    const parsed = JSON.parse(row.value) as Partial<PaymentCopySettings>;
    return sanitizeCopy(parsed);
  } catch {
    return { ...DEFAULT_PAYMENT_COPY };
  }
}

export async function setPaymentCopySettings(
  patch: Partial<PaymentCopySettings>
): Promise<PaymentCopySettings> {
  const current = await getPaymentCopySettings();
  const merged: Partial<PaymentCopySettings> = {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).map(([k, v]) => [
        k,
        v !== undefined ? String(v).trim() : undefined,
      ])
    ),
  };
  const next = sanitizeCopy(merged);

  await prisma.siteSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });

  return next;
}
