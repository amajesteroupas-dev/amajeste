import { getTrafficIntegrationSecrets } from "@/lib/traffic-ads-settings";
import { prisma } from "@/lib/prisma";
import { parseInstagramUrl } from "@/lib/instagram";

const GRAPH = "https://graph.facebook.com/v21.0";

/**
 * Publica foto no Instagram (Content Publishing API).
 * Requer Instagram Business/Creator ligado a uma Page + token com
 * instagram_content_publish / pages permissions.
 */
export async function publishInstagramPhoto(input: {
  imageUrl: string;
  caption: string;
}) {
  const secrets = await getTrafficIntegrationSecrets();
  const token =
    secrets.instagram.accessToken ||
    secrets.meta.adsToken ||
    secrets.meta.capiToken;
  const igUserId = secrets.instagram.userId;
  if (!token || !igUserId) {
    return {
      ok: false as const,
      reason:
        "Configure Instagram User ID + token (ou use o token Meta com permissão de publicação) nas Integrações.",
    };
  }

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://amajeste.com.br"
  ).replace(/\/$/, "");
  const imageUrl = input.imageUrl.startsWith("http")
    ? input.imageUrl
    : `${site}${input.imageUrl.startsWith("/") ? "" : "/"}${input.imageUrl}`;

  const createRes = await fetch(`${GRAPH}/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: input.caption.slice(0, 2200),
      access_token: token,
    }),
  });
  const created = (await createRes.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!createRes.ok || !created.id) {
    return {
      ok: false as const,
      reason: created.error?.message || `Falha ao criar mídia IG (${createRes.status})`,
    };
  }

  // Aguarda processamento curto
  await new Promise((r) => setTimeout(r, 2500));

  const pubRes = await fetch(`${GRAPH}/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: created.id,
      access_token: token,
    }),
  });
  const published = (await pubRes.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!pubRes.ok || !published.id) {
    return {
      ok: false as const,
      reason:
        published.error?.message ||
        `Falha ao publicar no Instagram (${pubRes.status})`,
    };
  }

  // Registra na galeria da loja se conseguirmos permalink
  let permalink: string | null = null;
  try {
    const infoRes = await fetch(
      `${GRAPH}/${published.id}?fields=permalink,caption,media_type,timestamp&access_token=${encodeURIComponent(token)}`
    );
    const info = (await infoRes.json().catch(() => ({}))) as {
      permalink?: string;
      caption?: string;
      media_type?: string;
      timestamp?: string;
    };
    permalink = info.permalink || null;
    if (permalink) {
      const parsed = parseInstagramUrl(permalink);
      if (parsed) {
        const maxOrder = await prisma.instagramPost.aggregate({
          _max: { sortOrder: true },
        });
        await prisma.instagramPost
          .create({
            data: {
              permalink: parsed.permalink,
              shortcode: parsed.shortcode,
              mediaType:
                info.media_type === "VIDEO" || info.media_type === "CAROUSEL"
                  ? info.media_type
                  : "IMAGE",
              caption: info.caption || input.caption.slice(0, 500),
              coverUrl: imageUrl,
              thumbnailUrl: imageUrl,
              active: true,
              sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
              postedAt: info.timestamp ? new Date(info.timestamp) : new Date(),
            },
          })
          .catch(() => null);
      }
    }
  } catch {
    /* ignore gallery sync */
  }

  return {
    ok: true as const,
    mediaId: published.id,
    permalink,
  };
}
