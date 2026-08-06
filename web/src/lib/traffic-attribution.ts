/** Atribuição de tráfego — tipos e helpers compartilháveis (sem Node APIs). */

export type TrafficAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  /** fbclid ou gclid */
  clickId: string | null;
  capturedAt: string;
};

export const ATTR_STORAGE_KEY = "majeste-attr";
export const ATTR_COOKIE_NAME = "majeste-attr";
export const ATTR_TTL_DAYS = 30;

export function emptyAttribution(): TrafficAttribution {
  return {
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null,
    clickId: null,
    capturedAt: new Date().toISOString(),
  };
}

function clean(v: unknown, max = 120): string | null {
  if (v == null) return null;
  const s = String(v).trim().slice(0, max);
  return s || null;
}

/** Lê UTM / click ids de um URLSearchParams ou objeto. */
export function parseAttributionFromSearch(
  params: URLSearchParams | Record<string, string | undefined | null>
): TrafficAttribution | null {
  const get = (k: string) => {
    if (params instanceof URLSearchParams) return params.get(k);
    return params[k] ?? null;
  };

  const utmSource = clean(get("utm_source"));
  const utmMedium = clean(get("utm_medium"));
  const utmCampaign = clean(get("utm_campaign"));
  const utmContent = clean(get("utm_content"));
  const utmTerm = clean(get("utm_term"));
  const fbclid = clean(get("fbclid"), 200);
  const gclid = clean(get("gclid"), 200);
  const clickId = fbclid || gclid;

  if (
    !utmSource &&
    !utmMedium &&
    !utmCampaign &&
    !utmContent &&
    !utmTerm &&
    !clickId
  ) {
    return null;
  }

  return {
    utmSource: utmSource || (fbclid ? "meta" : gclid ? "google" : null),
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    clickId,
    capturedAt: new Date().toISOString(),
  };
}

export function parseAttributionPayload(
  raw: unknown
): TrafficAttribution | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const utmSource = clean(o.utmSource ?? o.utm_source);
  const utmMedium = clean(o.utmMedium ?? o.utm_medium);
  const utmCampaign = clean(o.utmCampaign ?? o.utm_campaign);
  const utmContent = clean(o.utmContent ?? o.utm_content);
  const utmTerm = clean(o.utmTerm ?? o.utm_term);
  const clickId = clean(o.clickId ?? o.click_id ?? o.fbclid ?? o.gclid, 200);
  if (
    !utmSource &&
    !utmMedium &&
    !utmCampaign &&
    !utmContent &&
    !utmTerm &&
    !clickId
  ) {
    return null;
  }
  const capturedAt =
    typeof o.capturedAt === "string" && o.capturedAt
      ? o.capturedAt
      : new Date().toISOString();
  return {
    utmSource: utmSource || (clickId?.startsWith("EA") ? "meta" : null),
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    clickId,
    capturedAt,
  };
}

export function isAttributionFresh(
  attr: TrafficAttribution | null,
  ttlDays = ATTR_TTL_DAYS
): boolean {
  if (!attr?.capturedAt) return false;
  const t = Date.parse(attr.capturedAt);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < ttlDays * 24 * 60 * 60 * 1000;
}

/** Normaliza utm_source → platform do painel. */
export function normalizeTrafficPlatform(source: string | null | undefined): string {
  const s = (source || "").trim().toLowerCase();
  if (!s || s === "(direct)" || s === "direct") return "direct";
  if (
    ["meta", "facebook", "fb", "ig", "instagram", "fbads", "instagram_ads"].includes(
      s
    )
  ) {
    return "meta";
  }
  if (["google", "goog", "adwords", "youtube", "gads"].includes(s)) {
    return "google";
  }
  if (["tiktok", "tt", "tik_tok"].includes(s)) return "tiktok";
  if (["pinterest", "pin"].includes(s)) return "pinterest";
  if (["whatsapp", "wa", "wpp"].includes(s)) return "whatsapp";
  if (["organic_ig", "ig_organic"].includes(s)) return "organic_ig";
  if (["organic_google", "seo", "organic"].includes(s)) return "organic_google";
  return "other";
}

export function platformLabel(platform: string): string {
  const map: Record<string, string> = {
    meta: "Meta (Instagram / Facebook)",
    google: "Google Ads",
    tiktok: "TikTok",
    pinterest: "Pinterest",
    whatsapp: "WhatsApp",
    organic_ig: "Instagram orgânico",
    organic_google: "Google orgânico",
    direct: "Direto / sem UTM",
    other: "Outro",
  };
  return map[platform] || platform;
}

export type TrafficHealth = "good" | "warn" | "bad" | "neutral";

export function computeTrafficHealth(input: {
  visitsWeek: number;
  attributedOrdersWeek: number;
  attributedRevenueWeek: number;
  campaignSpend: number;
  campaignRoas: number;
}): TrafficHealth {
  const {
    visitsWeek,
    attributedOrdersWeek,
    attributedRevenueWeek,
    campaignSpend,
    campaignRoas,
  } = input;

  if (campaignSpend > 0 && attributedOrdersWeek === 0) return "bad";
  if (
    attributedOrdersWeek >= 1 &&
    (campaignSpend <= 0 || campaignRoas >= 2 || attributedRevenueWeek > 0)
  ) {
    return "good";
  }
  if (visitsWeek >= 5 && attributedOrdersWeek === 0) return "warn";
  if (attributedOrdersWeek >= 1) return "good";
  return "neutral";
}

export function trafficHealthCopy(status: TrafficHealth): {
  title: string;
  detail: string;
} {
  switch (status) {
    case "good":
      return {
        title: "Está dando certo",
        detail:
          "Há vendas pagas ligadas ao tráfego (ou ROAS saudável). Mantenha o que funciona e escale com cuidado.",
      };
    case "warn":
      return {
        title: "Atenção",
        detail:
          "Tem visita, mas pouca venda atribuída. Confira o link do anúncio (UTM), a página de destino e o estoque.",
      };
    case "bad":
      return {
        title: "Não está convertendo",
        detail:
          "Há investimento cadastrado e quase nenhuma venda atribuída. Pause criativos fracos e revise oferta/Pixel.",
      };
    default:
      return {
        title: "Ainda sem dados",
        detail:
          "Use links com UTM nos anúncios e registre o gasto nas campanhas. Os pedidos pagos aparecem aqui automaticamente.",
      };
  }
}
