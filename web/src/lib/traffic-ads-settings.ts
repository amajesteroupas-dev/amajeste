import { prisma } from "@/lib/prisma";

const KEYS = {
  metaPixelId: "metaPixelId",
  metaCapiToken: "metaCapiAccessToken",
  metaAdsToken: "metaAdsAccessToken",
  metaAdAccountId: "metaAdAccountId",
  metaPageId: "metaPageId",
  googleCustomerId: "googleAdsCustomerId",
  googleDeveloperToken: "googleAdsDeveloperToken",
  googleClientId: "googleAdsClientId",
  googleClientSecret: "googleAdsClientSecret",
  googleRefreshToken: "googleAdsRefreshToken",
  tiktokPixelId: "tiktokPixelId",
  tiktokAccessToken: "tiktokAccessToken",
  pinterestAdAccountId: "pinterestAdAccountId",
  pinterestAccessToken: "pinterestAccessToken",
  instagramUserId: "instagramUserId",
  instagramAccessToken: "instagramAccessToken",
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

function envOr(map: Record<string, string>, key: string, envName: string) {
  return map[key]?.trim() || process.env[envName]?.trim() || "";
}

export type TrafficIntegrations = {
  meta: {
    pixelId: string;
    hasCapiToken: boolean;
    hasAdsToken: boolean;
    adAccountId: string;
    pageId: string;
  };
  google: {
    customerId: string;
    hasDeveloperToken: boolean;
    hasOAuth: boolean;
  };
  tiktok: {
    pixelId: string;
    hasToken: boolean;
  };
  pinterest: {
    adAccountId: string;
    hasToken: boolean;
  };
  instagram: {
    userId: string;
    hasToken: boolean;
  };
};

/** Credenciais completas (só servidor). */
export async function getTrafficIntegrationSecrets() {
  const map = await getMap(Object.values(KEYS));
  const metaCapi =
    envOr(map, KEYS.metaCapiToken, "META_CAPI_ACCESS_TOKEN") ||
    envOr(map, KEYS.metaAdsToken, "META_ADS_ACCESS_TOKEN");
  const metaAds =
    envOr(map, KEYS.metaAdsToken, "META_ADS_ACCESS_TOKEN") || metaCapi;

  return {
    meta: {
      pixelId: envOr(map, KEYS.metaPixelId, "META_PIXEL_ID"),
      capiToken: envOr(map, KEYS.metaCapiToken, "META_CAPI_ACCESS_TOKEN"),
      adsToken: metaAds,
      adAccountId: envOr(map, KEYS.metaAdAccountId, "META_AD_ACCOUNT_ID").replace(
        /^act_/,
        ""
      ),
      pageId: envOr(map, KEYS.metaPageId, "META_PAGE_ID"),
    },
    google: {
      customerId: envOr(map, KEYS.googleCustomerId, "GOOGLE_ADS_CUSTOMER_ID").replace(
        /-/g,
        ""
      ),
      developerToken: envOr(
        map,
        KEYS.googleDeveloperToken,
        "GOOGLE_ADS_DEVELOPER_TOKEN"
      ),
      clientId: envOr(map, KEYS.googleClientId, "GOOGLE_ADS_CLIENT_ID"),
      clientSecret: envOr(
        map,
        KEYS.googleClientSecret,
        "GOOGLE_ADS_CLIENT_SECRET"
      ),
      refreshToken: envOr(
        map,
        KEYS.googleRefreshToken,
        "GOOGLE_ADS_REFRESH_TOKEN"
      ),
    },
    tiktok: {
      pixelId: envOr(map, KEYS.tiktokPixelId, "TIKTOK_PIXEL_ID"),
      accessToken: envOr(map, KEYS.tiktokAccessToken, "TIKTOK_ACCESS_TOKEN"),
    },
    pinterest: {
      adAccountId: envOr(
        map,
        KEYS.pinterestAdAccountId,
        "PINTEREST_AD_ACCOUNT_ID"
      ),
      accessToken: envOr(
        map,
        KEYS.pinterestAccessToken,
        "PINTEREST_ACCESS_TOKEN"
      ),
    },
    instagram: {
      userId:
        envOr(map, KEYS.instagramUserId, "INSTAGRAM_USER_ID") ||
        envOr(map, KEYS.instagramUserId, "IG_USER_ID"),
      accessToken:
        envOr(map, KEYS.instagramAccessToken, "INSTAGRAM_ACCESS_TOKEN") ||
        metaAds,
    },
  };
}

export async function getTrafficIntegrationsPublic(): Promise<TrafficIntegrations> {
  const s = await getTrafficIntegrationSecrets();
  return {
    meta: {
      pixelId: s.meta.pixelId,
      hasCapiToken: Boolean(s.meta.capiToken),
      hasAdsToken: Boolean(s.meta.adsToken),
      adAccountId: s.meta.adAccountId,
      pageId: s.meta.pageId,
    },
    google: {
      customerId: s.google.customerId,
      hasDeveloperToken: Boolean(s.google.developerToken),
      hasOAuth: Boolean(
        s.google.clientId && s.google.clientSecret && s.google.refreshToken
      ),
    },
    tiktok: {
      pixelId: s.tiktok.pixelId,
      hasToken: Boolean(s.tiktok.accessToken),
    },
    pinterest: {
      adAccountId: s.pinterest.adAccountId,
      hasToken: Boolean(s.pinterest.accessToken),
    },
    instagram: {
      userId: s.instagram.userId,
      hasToken: Boolean(s.instagram.userId && s.instagram.accessToken),
    },
  };
}

export async function saveTrafficIntegrations(input: {
  metaPixelId?: string;
  metaCapiToken?: string;
  metaAdsToken?: string;
  metaAdAccountId?: string;
  metaPageId?: string;
  clearMetaCapiToken?: boolean;
  clearMetaAdsToken?: boolean;
  googleCustomerId?: string;
  googleDeveloperToken?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  clearGoogleSecrets?: boolean;
  tiktokPixelId?: string;
  tiktokAccessToken?: string;
  clearTiktokToken?: boolean;
  pinterestAdAccountId?: string;
  pinterestAccessToken?: string;
  clearPinterestToken?: boolean;
  instagramUserId?: string;
  instagramAccessToken?: string;
  clearInstagramToken?: boolean;
}) {
  const set = async (key: string, value: string | undefined, clear?: boolean) => {
    if (clear) {
      await upsert(key, "");
      return;
    }
    if (value === undefined) return;
    await upsert(key, String(value).trim());
  };

  await set(KEYS.metaPixelId, input.metaPixelId);
  await set(KEYS.metaCapiToken, input.metaCapiToken, input.clearMetaCapiToken);
  await set(KEYS.metaAdsToken, input.metaAdsToken, input.clearMetaAdsToken);
  if (input.metaAdAccountId !== undefined) {
    await upsert(
      KEYS.metaAdAccountId,
      String(input.metaAdAccountId).trim().replace(/^act_/, "")
    );
  }
  await set(KEYS.metaPageId, input.metaPageId);

  if (input.googleCustomerId !== undefined) {
    await upsert(
      KEYS.googleCustomerId,
      String(input.googleCustomerId).replace(/-/g, "").trim()
    );
  }
  await set(
    KEYS.googleDeveloperToken,
    input.googleDeveloperToken,
    input.clearGoogleSecrets
  );
  await set(KEYS.googleClientId, input.googleClientId, input.clearGoogleSecrets);
  await set(
    KEYS.googleClientSecret,
    input.googleClientSecret,
    input.clearGoogleSecrets
  );
  await set(
    KEYS.googleRefreshToken,
    input.googleRefreshToken,
    input.clearGoogleSecrets
  );

  await set(KEYS.tiktokPixelId, input.tiktokPixelId);
  await set(
    KEYS.tiktokAccessToken,
    input.tiktokAccessToken,
    input.clearTiktokToken
  );

  await set(KEYS.pinterestAdAccountId, input.pinterestAdAccountId);
  await set(
    KEYS.pinterestAccessToken,
    input.pinterestAccessToken,
    input.clearPinterestToken
  );

  await set(KEYS.instagramUserId, input.instagramUserId);
  await set(
    KEYS.instagramAccessToken,
    input.instagramAccessToken,
    input.clearInstagramToken
  );

  return getTrafficIntegrationsPublic();
}
