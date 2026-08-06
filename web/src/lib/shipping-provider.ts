import { prisma } from "@/lib/prisma";

export const SHIPPING_QUOTE_PROVIDER_KEY = "shippingQuoteProvider";

export type ShippingQuoteProvider = "melhor_envio" | "manda_bem" | "both";

const VALID: ShippingQuoteProvider[] = ["melhor_envio", "manda_bem", "both"];

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function getShippingQuoteProvider(): Promise<ShippingQuoteProvider> {
  const raw =
    (await getSetting(SHIPPING_QUOTE_PROVIDER_KEY))?.trim() ||
    process.env.SHIPPING_QUOTE_PROVIDER?.trim() ||
    "both";
  if (VALID.includes(raw as ShippingQuoteProvider)) {
    return raw as ShippingQuoteProvider;
  }
  return "both";
}

export async function setShippingQuoteProvider(provider: ShippingQuoteProvider) {
  const value = VALID.includes(provider) ? provider : "both";
  await prisma.siteSetting.upsert({
    where: { key: SHIPPING_QUOTE_PROVIDER_KEY },
    create: { key: SHIPPING_QUOTE_PROVIDER_KEY, value },
    update: { value },
  });
  return value as ShippingQuoteProvider;
}

export function shippingProviderLabel(p: ShippingQuoteProvider) {
  if (p === "melhor_envio") return "Melhor Envio";
  if (p === "manda_bem") return "Manda Bem";
  return "Comparar as duas (menor preço)";
}
