import { prisma } from "@/lib/prisma";
import { defaultPayment } from "@/lib/site";
import {
  DEFAULT_SITE_PROMO,
  listLivePromotions,
  newPromotionId,
  pickBestPromotion,
  type ActiveSitePromotion,
  type CheckoutPaymentContext,
  type PromoPaymentScope,
  type SitePromotion,
  type SitePromotionSettings,
} from "@/lib/promotion-pricing";

export {
  DEFAULT_SITE_PROMO,
  applyPriceAdjust,
  computeCheckoutDiscounts,
  isPromotionCurrentlyActive,
  isPromoLive,
  listLivePromotions,
  pickBestPromotion,
  promoMatchesPayment,
  promoPrice,
  promoScheduleStatus,
  scopeLabel,
  type ActiveSitePromotion,
  type CheckoutPaymentContext,
  type PromoPaymentScope,
  type SitePromotion,
  type SitePromotionSettings,
} from "@/lib/promotion-pricing";

const LIST_KEY = "sitePromotionsJson";

/** Chaves da promoção única antiga (migração). */
const LEGACY_KEYS = {
  enabled: "sitePromoEnabled",
  percent: "sitePromoPercent",
  endsAt: "sitePromoEndsAt",
  label: "sitePromoLabel",
} as const;

async function getMap(keys: string[]) {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

async function upsert(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function flag(raw: string | undefined, fallback: boolean) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

function num(raw: string | undefined, fallback: number) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const n = Number(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function normalizePromo(raw: Partial<SitePromotion> & { id?: string }): SitePromotion {
  const scope: PromoPaymentScope =
    raw.scope === "pix" || raw.scope === "card" || raw.scope === "all"
      ? raw.scope
      : "all";
  let cardMax: number | null =
    raw.cardInstallmentsMax === undefined || raw.cardInstallmentsMax === null
      ? null
      : Math.max(1, Math.min(24, Number(raw.cardInstallmentsMax) || 1));
  if (scope === "pix") cardMax = null;

  return {
    id: raw.id || newPromotionId(),
    label: String(raw.label || "Promoção").trim() || "Promoção",
    enabled: Boolean(raw.enabled),
    percent: Math.min(90, Math.max(0, Number(raw.percent) || 0)),
    startsAt: raw.startsAt ? String(raw.startsAt) : null,
    endsAt: raw.endsAt ? String(raw.endsAt) : null,
    scope,
    cardInstallmentsMax: cardMax,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

function legacyAsList(map: Record<string, string>): SitePromotion[] {
  const endsRaw = map[LEGACY_KEYS.endsAt];
  return [
    normalizePromo({
      id: "promo_legacy_site",
      label:
        (map[LEGACY_KEYS.label] || DEFAULT_SITE_PROMO.label).trim() ||
        DEFAULT_SITE_PROMO.label,
      enabled: flag(map[LEGACY_KEYS.enabled], DEFAULT_SITE_PROMO.enabled),
      percent: num(map[LEGACY_KEYS.percent], DEFAULT_SITE_PROMO.percent),
      startsAt: null,
      endsAt:
        endsRaw === undefined || endsRaw === ""
          ? DEFAULT_SITE_PROMO.endsAt
          : endsRaw === "null"
            ? null
            : endsRaw,
      scope: "all",
      cardInstallmentsMax: null,
      createdAt: new Date().toISOString(),
    }),
  ];
}

export async function listSitePromotions(): Promise<SitePromotion[]> {
  const map = await getMap([LIST_KEY, ...Object.values(LEGACY_KEYS)]);
  const raw = map[LIST_KEY];

  if (raw?.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((p) => normalizePromo(p as Partial<SitePromotion>));
      }
    } catch {
      /* fall through */
    }
  }

  const hasLegacy = Object.values(LEGACY_KEYS).some((k) => map[k] !== undefined);
  const list = hasLegacy
    ? legacyAsList(map)
    : [
        normalizePromo({
          id: "promo_default_20",
          label: DEFAULT_SITE_PROMO.label,
          enabled: DEFAULT_SITE_PROMO.enabled,
          percent: DEFAULT_SITE_PROMO.percent,
          startsAt: null,
          endsAt: DEFAULT_SITE_PROMO.endsAt,
          scope: "all",
          cardInstallmentsMax: null,
        }),
      ];

  await upsert(LIST_KEY, JSON.stringify(list));
  return list;
}

async function saveList(list: SitePromotion[]) {
  await upsert(LIST_KEY, JSON.stringify(list));
  return list;
}

export async function createSitePromotion(
  input: Partial<SitePromotion>
): Promise<SitePromotion> {
  const list = await listSitePromotions();
  const promo = normalizePromo({
    ...input,
    id: newPromotionId(),
    createdAt: new Date().toISOString(),
    enabled: input.enabled !== undefined ? Boolean(input.enabled) : true,
  });
  list.unshift(promo);
  await saveList(list);
  return promo;
}

export async function updateSitePromotion(
  id: string,
  patch: Partial<SitePromotion>
): Promise<SitePromotion | null> {
  const list = await listSitePromotions();
  const idx = list.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const clean = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined)
  ) as Partial<SitePromotion>;
  const next = normalizePromo({ ...list[idx], ...clean, id });
  list[idx] = next;
  await saveList(list);
  return next;
}

export async function deleteSitePromotion(id: string): Promise<boolean> {
  const list = await listSitePromotions();
  const next = list.filter((p) => p.id !== id);
  if (next.length === list.length) return false;
  await saveList(next);
  return true;
}

export async function setSitePromotionEnabled(
  id: string,
  enabled: boolean
): Promise<SitePromotion | null> {
  return updateSitePromotion(id, { enabled });
}

/** Compat: “promoção do site” = melhor promo ativa de escopo all, senão a de maior %. */
export async function getActiveSitePromotion(
  now = new Date()
): Promise<ActiveSitePromotion> {
  const list = await listSitePromotions();
  const live = listLivePromotions(list, now);
  const allScope = live.filter((p) => p.scope === "all");
  const best =
    allScope.sort((a, b) => b.percent - a.percent)[0] ||
    live.sort((a, b) => b.percent - a.percent)[0] ||
    null;

  if (!best) {
    return {
      active: false,
      enabled: false,
      percent: 0,
      startsAt: null,
      endsAt: null,
      label: "",
      pixPercentIncluded: defaultPayment.pixDiscountPercent,
      scope: "all",
      cardInstallmentsMax: null,
      id: null,
    };
  }

  return {
    active: true,
    enabled: best.enabled,
    percent: best.percent,
    startsAt: best.startsAt,
    endsAt: best.endsAt,
    label: best.label,
    pixPercentIncluded: defaultPayment.pixDiscountPercent,
    scope: best.scope,
    cardInstallmentsMax: best.cardInstallmentsMax,
    id: best.id,
  };
}

export async function getLivePromotions(now = new Date()) {
  return listLivePromotions(await listSitePromotions(), now);
}

export async function resolveCheckoutPromotion(
  ctx: CheckoutPaymentContext,
  now = new Date()
) {
  return pickBestPromotion(await listSitePromotions(), ctx, now);
}

/** @deprecated — usa a lista; mantido para API admin antiga */
export async function getPromotionSettings(): Promise<SitePromotionSettings> {
  const active = await getActiveSitePromotion();
  return {
    enabled: active.enabled || active.active,
    percent: active.percent || DEFAULT_SITE_PROMO.percent,
    endsAt: active.endsAt,
    label: active.label || DEFAULT_SITE_PROMO.label,
  };
}

/** @deprecated */
export async function setPromotionSettings(
  patch: Partial<SitePromotionSettings>
): Promise<SitePromotionSettings> {
  const list = await listSitePromotions();
  let all = list.find((p) => p.scope === "all");
  if (!all) {
    all = await createSitePromotion({
      label: patch.label || DEFAULT_SITE_PROMO.label,
      enabled: patch.enabled ?? true,
      percent: patch.percent ?? DEFAULT_SITE_PROMO.percent,
      endsAt: patch.endsAt ?? DEFAULT_SITE_PROMO.endsAt,
      scope: "all",
    });
  } else {
    await updateSitePromotion(all.id, {
      enabled: patch.enabled,
      percent: patch.percent,
      endsAt: patch.endsAt,
      label: patch.label,
    });
  }
  return getPromotionSettings();
}
