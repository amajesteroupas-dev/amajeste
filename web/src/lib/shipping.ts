import { getMelhorEnvioConfig } from "@/lib/melhor-envio-settings";
import { quoteMandaBem } from "@/lib/manda-bem-api";
import { getShippingQuoteProvider } from "@/lib/shipping-provider";
import { whatsappUrl } from "@/lib/site";

export type ShippingQuote = {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryDays: number;
  currency: string;
  /** Opção local (não Melhor Envio) */
  local?: boolean;
  /** Texto auxiliar exibido no checkout */
  note?: string;
};

export type ShippingProductInput = {
  id?: string;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  weightKg: number;
  insuranceValue?: number;
  quantity: number;
};

/** Defaults sensatos para moda fitness se o produto não tiver medida cadastrada. */
export const DEFAULT_SHIPPING_DIMS = {
  weightKg: 0.4,
  lengthCm: 30,
  widthCm: 25,
  heightCm: 5,
} as const;

/** Frete local Planaltina / Sobradinho — combine pelo WhatsApp */
export const LOCAL_SHIPPING_ID = "local-planaltina-sobradinho";

export function localShippingQuote(): ShippingQuote {
  return {
    id: LOCAL_SHIPPING_ID,
    name: "Planaltina / Sobradinho",
    company: "Entrega local",
    price: 0,
    deliveryDays: 1,
    currency: "BRL",
    local: true,
    note: "Combine a entrega pelo WhatsApp da loja (a combinar).",
  };
}

export function isLocalShippingId(id?: string | null) {
  return id === LOCAL_SHIPPING_ID;
}

/** IDs oficiais Correios no Melhor Envio (produção). */
export const ME_SERVICE_PAC = 1;
export const ME_SERVICE_SEDEX = 2;

/**
 * Converte o serviço gravado no pedido (Melhor Envio numérico, Manda Bem
 * `mb-pac`/`mb-sedex`, ou mock `pac`/`sedex`) no ID usado para gerar etiqueta.
 */
export function resolveMelhorEnvioServiceId(
  shippingServiceId?: string | null,
  shippingMethod?: string | null
): number | null {
  const sid = String(shippingServiceId || "").trim();
  if (/^\d+$/.test(sid)) {
    const n = Number(sid);
    return n > 0 ? n : null;
  }

  const key = sid.toLowerCase();
  if (key === "mb-pac" || key === "pac") return ME_SERVICE_PAC;
  if (key === "mb-sedex" || key === "sedex") return ME_SERVICE_SEDEX;

  const method = String(shippingMethod || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  if (/\bsedex\b/.test(method)) return ME_SERVICE_SEDEX;
  if (/\bpac\b/.test(method)) return ME_SERVICE_PAC;
  return null;
}

/** Só Correios PAC e SEDEX (exclui Mini Envios, SEDEX Hoje, outras transportadoras). */
export function isCorreiosPacOrSedex(name: string, company: string) {
  const c = (company || "").toLowerCase();
  const n = (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
  if (c.includes("manda bem")) {
    return (
      n === "pac" ||
      n === "sedex" ||
      n === "pac mini" ||
      n.startsWith("pac ") ||
      n.startsWith("sedex ")
    );
  }
  if (!c.includes("correios")) return false;
  if (n.includes("mini") || n.includes("hoje") || n.includes("10") || n.includes("12")) {
    return false;
  }
  return n === "pac" || n === "sedex" || n.startsWith("pac ") || n.startsWith("sedex ");
}

export function meBase(sandbox: boolean) {
  return sandbox
    ? "https://sandbox.melhorenvio.com.br"
    : "https://www.melhorenvio.com.br";
}

function withLocalOption(quotes: ShippingQuote[]): ShippingQuote[] {
  const local = localShippingQuote();
  const rest = quotes.filter((q) => q.id !== LOCAL_SHIPPING_ID);
  return [local, ...rest];
}

/** Junta cotações de várias fontes; para o mesmo serviço, fica a mais barata. */
function mergeQuotes(groups: ShippingQuote[][]): ShippingQuote[] {
  const byKey = new Map<string, ShippingQuote>();
  for (const group of groups) {
    for (const q of group) {
      if (q.local) continue;
      const key = `${q.name}`.toLowerCase().replace(/\s+/g, "");
      const prev = byKey.get(key);
      if (!prev || q.price < prev.price) byKey.set(key, q);
    }
  }
  return [...byKey.values()].sort((a, b) => a.price - b.price);
}

async function quoteMelhorEnvio(params: {
  fromZip: string;
  toZip: string;
  products: ShippingProductInput[];
}): Promise<ShippingQuote[]> {
  const cfg = await getMelhorEnvioConfig();
  const token = cfg.token;
  if (!token) return [];

  const res = await fetch(`${meBase(cfg.sandbox)}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": cfg.userAgent,
    },
    body: JSON.stringify({
      from: { postal_code: params.fromZip.replace(/\D/g, "") },
      to: { postal_code: params.toZip.replace(/\D/g, "") },
      products: params.products.map((p, i) => ({
        id: p.id || String(i + 1),
        width: Math.max(1, Math.round(p.widthCm)),
        height: Math.max(1, Math.round(p.heightCm)),
        length: Math.max(1, Math.round(p.lengthCm)),
        weight: Math.max(0.01, Number(p.weightKg.toFixed(3))),
        insurance_value: Number(p.insuranceValue || 0),
        quantity: Math.max(1, Math.round(p.quantity)),
      })),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Melhor Envio calculate failed", res.status, detail);
    return [];
  }

  const data = await res.json();
  return (
    data as Array<{
      id: number | string;
      name: string;
      company?: { name?: string };
      price?: string | number;
      custom_price?: string | number;
      delivery_time?: number;
      currency?: string;
      error?: string;
    }>
  )
    .filter((q) => !q.error)
    .map((q) => ({
      id: String(q.id),
      name: q.name,
      company: q.company?.name || "Transportadora",
      price: Number(q.custom_price ?? q.price ?? 0),
      deliveryDays: q.delivery_time ?? 7,
      currency: q.currency || "BRL",
    }))
    .filter((q) => isCorreiosPacOrSedex(q.name, q.company))
    .sort((a, b) => a.price - b.price);
}

function mockQuotes(products: ShippingProductInput[]): ShippingQuote[] {
  const totalWeight = products.reduce(
    (s, p) => s + p.weightKg * p.quantity,
    0
  );
  const base = 18 + totalWeight * 12;
  return [
    {
      id: "pac",
      name: "PAC",
      company: "Correios",
      price: Math.round((base + 4) * 100) / 100,
      deliveryDays: 8,
      currency: "BRL",
    },
    {
      id: "sedex",
      name: "SEDEX",
      company: "Correios",
      price: Math.round((base + 22) * 100) / 100,
      deliveryDays: 3,
      currency: "BRL",
    },
  ];
}

export async function quoteShipping(params: {
  fromZip: string;
  toZip: string;
  products: ShippingProductInput[];
}): Promise<ShippingQuote[]> {
  const products = params.products.length
    ? params.products
    : [
        {
          id: "1",
          ...DEFAULT_SHIPPING_DIMS,
          quantity: 1,
          insuranceValue: 0,
        },
      ];

  const mode = await getShippingQuoteProvider();

  const [meQuotes, mbQuotes] = await Promise.all([
    mode === "manda_bem"
      ? Promise.resolve([] as ShippingQuote[])
      : quoteMelhorEnvio({
          fromZip: params.fromZip,
          toZip: params.toZip,
          products,
        }).catch((e) => {
          console.error("ME quote error", e);
          return [] as ShippingQuote[];
        }),
    mode === "melhor_envio"
      ? Promise.resolve([] as ShippingQuote[])
      : quoteMandaBem({
          toZip: params.toZip,
          products,
          force: mode === "manda_bem" || mode === "both",
        }).catch((e) => {
          console.error("Manda Bem quote error", e);
          return [] as ShippingQuote[];
        }),
  ]);

  const merged = mergeQuotes([meQuotes, mbQuotes]);
  if (merged.length === 0) {
    const cfg = await getMelhorEnvioConfig();
    if (!cfg.token) {
      return withLocalOption(mockQuotes(products));
    }
    throw new Error("Falha ao cotar frete nas transportadoras");
  }

  return withLocalOption(merged);
}

export function localShippingWhatsAppUrl(orderHint?: string) {
  const text = orderHint
    ? `Olá! Quero combinar a entrega em Planaltina/Sobradinho. ${orderHint}`
    : "Olá! Quero combinar a entrega local em Planaltina ou Sobradinho.";
  return whatsappUrl(text);
}
