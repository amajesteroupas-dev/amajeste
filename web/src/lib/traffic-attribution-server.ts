import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizeTrafficPlatform,
  type TrafficAttribution,
} from "@/lib/traffic-attribution";
import {
  getTrafficIntegrationSecrets,
  getTrafficIntegrationsPublic,
  saveTrafficIntegrations,
} from "@/lib/traffic-ads-settings";

export async function getMetaPixelSettings() {
  const s = await getTrafficIntegrationSecrets();
  const accessToken = s.meta.capiToken || s.meta.adsToken;
  return {
    pixelId: s.meta.pixelId,
    accessToken,
    hasToken: Boolean(accessToken),
    fromEnv: {
      pixelId: Boolean(process.env.META_PIXEL_ID?.trim()),
      token: Boolean(process.env.META_CAPI_ACCESS_TOKEN?.trim()),
    },
  };
}

export async function saveMetaPixelSettings(input: {
  pixelId?: string;
  accessToken?: string;
  clearToken?: boolean;
}) {
  await saveTrafficIntegrations({
    metaPixelId: input.pixelId,
    metaCapiToken: input.accessToken,
    clearMetaCapiToken: input.clearToken,
  });
  return getMetaPixelSettings();
}

function sha256Norm(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return createHash("sha256").update(normalized).digest("hex");
}

async function loadPaidOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true },
  });
}

function orderContact(order: NonNullable<Awaited<ReturnType<typeof loadPaidOrder>>>) {
  const email = order.guestEmail || order.customer?.email || "";
  const phone = (order.guestPhone || order.customer?.phone || "").replace(
    /\D/g,
    ""
  );
  return { email, phone };
}

/**
 * Envia Purchase via Conversions API (servidor).
 * Usa event_id = order.id para deduplicar com browser, se houver.
 */
export async function sendMetaPurchaseEvent(orderId: string) {
  const settings = await getMetaPixelSettings();
  if (!settings.pixelId || !settings.accessToken) {
    return { ok: false, skipped: true as const, reason: "not_configured" };
  }

  const order = await loadPaidOrder(orderId);
  if (!order) return { ok: false, skipped: true as const, reason: "no_order" };

  const { email, phone } = orderContact(order);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://amajeste.com.br";

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
        action_source: "website",
        event_source_url: `${site}/checkout/sucesso`,
        user_data: {
          em: sha256Norm(email) ? [sha256Norm(email)] : undefined,
          ph: sha256Norm(phone) ? [sha256Norm(phone)] : undefined,
          external_id: sha256Norm(order.customerId || order.id)
            ? [sha256Norm(order.customerId || order.id)]
            : undefined,
          fbc: order.clickId?.includes(".")
            ? undefined
            : order.clickId
              ? `fb.1.${Date.now()}.${order.clickId}`
              : undefined,
        },
        custom_data: {
          currency: "BRL",
          value: Number(order.total),
          order_id: order.orderNumber,
          content_type: "product",
        },
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${settings.pixelId}/events?access_token=${encodeURIComponent(settings.accessToken)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[meta-capi]", res.status, data);
      return { ok: false, error: data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("[meta-capi]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "capi_error",
    };
  }
}

/** TikTok Events API — CompletePayment */
export async function sendTikTokPurchaseEvent(orderId: string) {
  const secrets = await getTrafficIntegrationSecrets();
  if (!secrets.tiktok.pixelId || !secrets.tiktok.accessToken) {
    return { ok: false, skipped: true as const, reason: "not_configured" };
  }
  const order = await loadPaidOrder(orderId);
  if (!order) return { ok: false, skipped: true as const, reason: "no_order" };
  const { email, phone } = orderContact(order);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://amajeste.com.br";

  const payload = {
    event_source: "web",
    event_source_id: secrets.tiktok.pixelId,
    data: [
      {
        event: "CompletePayment",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
        user: {
          email: sha256Norm(email),
          phone: sha256Norm(phone),
          external_id: sha256Norm(order.customerId || order.id),
        },
        page: { url: `${site}/checkout/sucesso` },
        properties: {
          currency: "BRL",
          value: Number(order.total),
          content_type: "product",
          order_id: order.orderNumber,
        },
      },
    ],
  };

  try {
    const res = await fetch(
      "https://business-api.tiktok.com/open_api/v1.3/event/track/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Access-Token": secrets.tiktok.accessToken,
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || (data.code !== undefined && data.code !== 0)) {
      console.error("[tiktok-capi]", res.status, data);
      return { ok: false, error: data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("[tiktok-capi]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "tiktok_error",
    };
  }
}

/** Pinterest Conversions API — checkout */
export async function sendPinterestPurchaseEvent(orderId: string) {
  const secrets = await getTrafficIntegrationSecrets();
  if (!secrets.pinterest.adAccountId || !secrets.pinterest.accessToken) {
    return { ok: false, skipped: true as const, reason: "not_configured" };
  }
  const order = await loadPaidOrder(orderId);
  if (!order) return { ok: false, skipped: true as const, reason: "no_order" };
  const { email, phone } = orderContact(order);
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://amajeste.com.br";

  const payload = {
    data: [
      {
        event_name: "checkout",
        action_source: "website",
        event_time: Math.floor(Date.now() / 1000),
        event_id: order.id,
        event_source_url: `${site}/checkout/sucesso`,
        user_data: {
          em: sha256Norm(email) ? [sha256Norm(email)] : undefined,
          ph: sha256Norm(phone) ? [sha256Norm(phone)] : undefined,
          external_id: sha256Norm(order.customerId || order.id)
            ? [sha256Norm(order.customerId || order.id)]
            : undefined,
        },
        custom_data: {
          currency: "BRL",
          value: String(Number(order.total).toFixed(2)),
          order_id: order.orderNumber,
          content_ids: [],
        },
      },
    ],
  };

  const url = `https://api.pinterest.com/v5/ad_accounts/${secrets.pinterest.adAccountId}/events`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secrets.pinterest.accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[pinterest-capi]", res.status, data);
      return { ok: false, error: data };
    }
    return { ok: true, data };
  } catch (e) {
    console.error("[pinterest-capi]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "pinterest_error",
    };
  }
}

export async function sendAllPurchaseConversionEvents(orderId: string) {
  const [meta, tiktok, pinterest] = await Promise.all([
    sendMetaPurchaseEvent(orderId),
    sendTikTokPurchaseEvent(orderId),
    sendPinterestPurchaseEvent(orderId),
  ]);
  return { meta, tiktok, pinterest };
}

export { getTrafficIntegrationsPublic, saveTrafficIntegrations };


/**
 * Soma receita/pedidos na campanha de tráfego correspondente (1x por pedido).
 */
export async function syncTrafficAttributionOnPaid(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "no_order" };
  if (order.attributionSyncedAt) {
    return { ok: true, skipped: true as const, reason: "already_synced" };
  }

  const platform = normalizeTrafficPlatform(order.utmSource);
  const hasAttr = Boolean(
    order.utmSource || order.utmCampaign || order.clickId
  );

  if (!hasAttr) {
    await prisma.order.update({
      where: { id: orderId },
      data: { attributionSyncedAt: new Date() },
    });
    return { ok: true, skipped: true as const, reason: "no_attribution" };
  }

  const campaignName =
    (order.utmCampaign || "").trim() ||
    `Auto · ${platform}${order.utmMedium ? ` · ${order.utmMedium}` : ""}`;

  const revenue = Number(order.total) || 0;

  await prisma.$transaction(async (tx) => {
    const locked = await tx.order.findUnique({ where: { id: orderId } });
    if (!locked || locked.attributionSyncedAt) return;

    const platformKey = platform === "direct" ? "other" : platform;

    let campaign = await tx.trafficCampaign.findFirst({
      where: {
        active: true,
        platform: platformKey,
        OR: [
          { name: { equals: campaignName, mode: "insensitive" } },
          ...(order.utmCampaign
            ? [
                {
                  name: {
                    contains: order.utmCampaign,
                    mode: "insensitive" as const,
                  },
                },
              ]
            : []),
        ],
      },
      orderBy: { startedAt: "desc" },
    });

    if (!campaign) {
      campaign = await tx.trafficCampaign.create({
        data: {
          name: campaignName.slice(0, 180),
          platform: platformKey,
          kind:
            platform === "organic_ig" || platform === "organic_google"
              ? "organic"
              : "paid",
          objective: "Vendas atribuídas automaticamente",
          spend: 0,
          revenue,
          orders: 1,
          notes: `Criada automaticamente no pagamento do pedido ${order.orderNumber}`,
          active: true,
        },
      });
    } else {
      await tx.trafficCampaign.update({
        where: { id: campaign.id },
        data: {
          revenue: { increment: revenue },
          orders: { increment: 1 },
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { attributionSyncedAt: new Date() },
    });
  });

  return { ok: true, platform, campaignName, revenue };
}

export function attributionToOrderFields(attr: TrafficAttribution | null) {
  if (!attr) {
    return {
      utmSource: null as string | null,
      utmMedium: null as string | null,
      utmCampaign: null as string | null,
      utmContent: null as string | null,
      utmTerm: null as string | null,
      clickId: null as string | null,
    };
  }
  return {
    utmSource: attr.utmSource,
    utmMedium: attr.utmMedium,
    utmCampaign: attr.utmCampaign,
    utmContent: attr.utmContent,
    utmTerm: attr.utmTerm,
    clickId: attr.clickId,
  };
}
