import { getTrafficIntegrationSecrets } from "@/lib/traffic-ads-settings";

const GRAPH = "https://graph.facebook.com/v21.0";

async function graphPost(
  path: string,
  token: string,
  body: Record<string, unknown>
) {
  const url = `${GRAPH}/${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, access_token: token }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Meta API HTTP ${res.status}`);
  }
  return data;
}

/**
 * Cria campanha + conjunto + anúncio de link (PAUSED) na conta Meta Ads.
 * O dono revisa e ativa no Ads Manager.
 */
export async function createMetaSalesCampaign(input: {
  name: string;
  dailyBudgetBrl: number;
  linkUrl: string;
  message: string;
  headline: string;
  description?: string;
  imageUrl?: string | null;
  pageId: string;
}) {
  const secrets = await getTrafficIntegrationSecrets();
  const token = secrets.meta.adsToken;
  const accountId = secrets.meta.adAccountId;
  const pixelId = secrets.meta.pixelId;
  if (!token || !accountId) {
    return {
      ok: false as const,
      reason: "Configure Ad Account ID + token Ads (ads_management) nas Integrações.",
    };
  }
  if (!input.pageId) {
    return {
      ok: false as const,
      reason: "Informe o Facebook Page ID nas Integrações (necessário para o anúncio).",
    };
  }

  const act = `act_${accountId}`;
  const dailyBudgetCents = Math.max(
    500,
    Math.round((Number(input.dailyBudgetBrl) || 30) * 100)
  );

  const campaign = await graphPost(`${act}/campaigns`, token, {
    name: input.name.slice(0, 200),
    objective: "OUTCOME_SALES",
    status: "PAUSED",
    special_ad_categories: [],
    is_adset_budget_sharing_enabled: false,
  });

  const adsetBody: Record<string, unknown> = {
    name: `${input.name.slice(0, 160)} · conjunto`,
    campaign_id: campaign.id,
    status: "PAUSED",
    billing_event: "IMPRESSIONS",
    optimization_goal: pixelId ? "OFFSITE_CONVERSIONS" : "LINK_CLICKS",
    bid_strategy: "LOWEST_COST_WITHOUT_CAP",
    daily_budget: dailyBudgetCents,
    targeting: {
      geo_locations: { countries: ["BR"] },
      age_min: 18,
      age_max: 45,
      genders: [2],
    },
  };
  if (pixelId) {
    adsetBody.promoted_object = {
      pixel_id: pixelId,
      custom_event_type: "PURCHASE",
    };
  }

  const adset = await graphPost(`${act}/adsets`, token, adsetBody);

  const linkData: Record<string, unknown> = {
    message: input.message.slice(0, 2000),
    link: input.linkUrl,
    name: input.headline.slice(0, 255),
    description: (input.description || "Compre no site Majesté").slice(0, 255),
    call_to_action: { type: "SHOP_NOW" },
  };
  if (input.imageUrl) {
    const abs = input.imageUrl.startsWith("http")
      ? input.imageUrl
      : `${(process.env.NEXT_PUBLIC_SITE_URL || "https://amajeste.com.br").replace(/\/$/, "")}${input.imageUrl.startsWith("/") ? "" : "/"}${input.imageUrl}`;
    linkData.picture = abs;
  }

  const creative = await graphPost(`${act}/adcreatives`, token, {
    name: `${input.name.slice(0, 100)} · criativo`,
    object_story_spec: {
      page_id: input.pageId,
      link_data: linkData,
    },
  });

  const ad = await graphPost(`${act}/ads`, token, {
    name: `${input.name.slice(0, 160)} · anúncio`,
    adset_id: adset.id,
    creative: { creative_id: creative.id },
    status: "PAUSED",
  });

  return {
    ok: true as const,
    campaignId: campaign.id!,
    adsetId: adset.id!,
    creativeId: creative.id!,
    adId: ad.id!,
    adsManagerUrl: `https://www.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaign.id}`,
    note: "Campanha criada PAUSADA. Revise e ative no Ads Manager.",
  };
}
