import { prisma } from "@/lib/prisma";
import { getTrafficIntegrationSecrets } from "@/lib/traffic-ads-settings";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function upsertCampaignSpend(input: {
  platform: string;
  name: string;
  spend: number;
  periodLabel: string;
}) {
  const name = input.name.slice(0, 180) || `Campanha ${input.platform}`;
  const existing = await prisma.trafficCampaign.findFirst({
    where: {
      platform: input.platform,
      active: true,
      name: { equals: name, mode: "insensitive" },
    },
    orderBy: { startedAt: "desc" },
  });

  if (existing) {
    return prisma.trafficCampaign.update({
      where: { id: existing.id },
      data: {
        spend: input.spend,
        notes: `Gasto sincronizado (${input.periodLabel}) em ${new Date().toISOString().slice(0, 16)}`,
        kind: "paid",
      },
    });
  }

  return prisma.trafficCampaign.create({
    data: {
      name,
      platform: input.platform,
      kind: "paid",
      objective: "Gasto sincronizado da API",
      spend: input.spend,
      revenue: 0,
      orders: 0,
      notes: `Criada na sync (${input.periodLabel})`,
      active: true,
      startedAt: daysAgo(7),
    },
  });
}

/** Meta Marketing API — insights por campanha (últimos N dias). */
export async function syncMetaAdSpend(days = 7) {
  const secrets = await getTrafficIntegrationSecrets();
  const token = secrets.meta.adsToken;
  const accountId = secrets.meta.adAccountId;
  if (!token || !accountId) {
    return {
      ok: false as const,
      skipped: true as const,
      reason: "Meta Ads: informe Account ID e token com permissão ads_read",
      updated: 0,
    };
  }

  const since = ymd(daysAgo(days - 1));
  const until = ymd(new Date());
  const periodLabel = `${since} → ${until}`;
  const act = `act_${accountId}`;
  const url = new URL(`https://graph.facebook.com/v21.0/${act}/insights`);
  url.searchParams.set("fields", "campaign_name,campaign_id,spend");
  url.searchParams.set("level", "campaign");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("limit", "200");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString());
  const data = (await res.json().catch(() => ({}))) as {
    data?: { campaign_name?: string; spend?: string }[];
    error?: { message?: string };
  };

  if (!res.ok) {
    return {
      ok: false as const,
      reason: data.error?.message || `Meta HTTP ${res.status}`,
      updated: 0,
    };
  }

  let updated = 0;
  for (const row of data.data || []) {
    const spend = Number(row.spend) || 0;
    if (spend <= 0) continue;
    const name = String(row.campaign_name || "").trim() || "Meta (sem nome)";
    await upsertCampaignSpend({
      platform: "meta",
      name,
      spend,
      periodLabel,
    });
    updated += 1;
  }

  return {
    ok: true as const,
    platform: "meta",
    periodLabel,
    updated,
    rows: (data.data || []).length,
  };
}

async function googleAccessToken(secrets: Awaited<
  ReturnType<typeof getTrafficIntegrationSecrets>
>["google"]) {
  if (
    !secrets.clientId ||
    !secrets.clientSecret ||
    !secrets.refreshToken
  ) {
    return null;
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: secrets.clientId,
      client_secret: secrets.clientSecret,
      refresh_token: secrets.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Falha ao renovar token Google");
  }
  return data.access_token;
}

/** Google Ads API — custo por campanha (últimos N dias). */
export async function syncGoogleAdSpend(days = 7) {
  const secrets = await getTrafficIntegrationSecrets();
  const g = secrets.google;
  if (!g.customerId || !g.developerToken) {
    return {
      ok: false as const,
      skipped: true as const,
      reason:
        "Google Ads: informe Customer ID e Developer Token (+ OAuth)",
      updated: 0,
    };
  }

  let accessToken: string;
  try {
    const t = await googleAccessToken(g);
    if (!t) {
      return {
        ok: false as const,
        skipped: true as const,
        reason: "Google Ads: configure Client ID, Secret e Refresh Token",
        updated: 0,
      };
    }
    accessToken = t;
  } catch (e) {
    return {
      ok: false as const,
      reason: e instanceof Error ? e.message : "OAuth Google falhou",
      updated: 0,
    };
  }

  const sinceDate = ymd(daysAgo(days - 1));
  const untilDate = ymd(new Date());
  const periodLabel = `${sinceDate} → ${untilDate}`;

  const query = `
    SELECT campaign.name, metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${sinceDate}' AND '${untilDate}'
      AND campaign.status != 'REMOVED'
  `.replace(/\s+/g, " ").trim();

  const url = `https://googleads.googleapis.com/v17/customers/${g.customerId}/googleAds:searchStream`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": g.developerToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let msg = `Google HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      msg = j.error?.message || j[0]?.error?.message || msg;
    } catch {
      /* keep */
    }
    return { ok: false as const, reason: msg, updated: 0 };
  }

  // searchStream returns NDJSON array chunks
  let results: {
    results?: {
      campaign?: { name?: string };
      metrics?: { costMicros?: string };
    }[];
  }[] = [];
  try {
    const parsed = JSON.parse(raw);
    results = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return {
      ok: false as const,
      reason: "Resposta Google inválida",
      updated: 0,
    };
  }

  const spendByName = new Map<string, number>();
  for (const chunk of results) {
    for (const row of chunk.results || []) {
      const name = String(row.campaign?.name || "").trim() || "Google (sem nome)";
      const micros = Number(row.metrics?.costMicros || 0);
      const spend = micros / 1_000_000;
      spendByName.set(name, (spendByName.get(name) || 0) + spend);
    }
  }

  let updated = 0;
  for (const [name, spend] of spendByName) {
    if (spend <= 0) continue;
    await upsertCampaignSpend({
      platform: "google",
      name,
      spend,
      periodLabel,
    });
    updated += 1;
  }

  return {
    ok: true as const,
    platform: "google",
    periodLabel,
    updated,
    rows: spendByName.size,
  };
}

export async function syncAllAdSpend(days = 7) {
  const meta = await syncMetaAdSpend(days);
  const google = await syncGoogleAdSpend(days);
  return { meta, google, days };
}
