import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { uploadRoot } from "@/lib/images";
import { parseInstagramUrl } from "@/lib/instagram";

export function usernameFromProfileUrl(input: string): string | null {
  try {
    const raw = input.trim();
    if (!raw.includes("instagram.com") && !raw.includes("/")) {
      return raw.replace(/^@/, "").replace(/\/$/, "") || null;
    }
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!u.hostname.includes("instagram.com")) return null;
    const part = u.pathname.split("/").filter(Boolean)[0];
    if (!part || ["p", "reel", "tv", "stories", "explore"].includes(part)) {
      return null;
    }
    return part.replace(/^@/, "");
  } catch {
    return null;
  }
}

/** Extrai todos os links de post/reel de um texto colado */
export function extractInstagramPostUrls(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const re =
    /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[A-Za-z0-9_-]+\/?/gi;
  const matches = text.match(re) || [];
  for (const m of matches) {
    const parsed = parseInstagramUrl(m);
    if (!parsed || seen.has(parsed.shortcode)) continue;
    seen.add(parsed.shortcode);
    out.push(parsed.permalink);
  }
  return out;
}

async function saveRemoteImage(imageUrl: string, folder = "instagram") {
  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      Referer: "https://www.instagram.com/",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const id = randomUUID();
  const dir = path.join(uploadRoot(), folder, id);
  await fs.mkdir(dir, { recursive: true });
  const out = path.join(dir, "cover.webp");
  await sharp(buf)
    .rotate()
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(out);
  return `/uploads/${folder}/${id}/cover.webp`;
}

/** Extrai capa (og:image) de um post/reel público */
export async function fetchPostCover(permalink: string): Promise<{
  coverUrl: string | null;
  caption: string | null;
  mediaTypeHint: "IMAGE" | "VIDEO" | "CAROUSEL" | null;
}> {
  const parsed = parseInstagramUrl(permalink);
  if (!parsed) {
    return { coverUrl: null, caption: null, mediaTypeHint: null };
  }

  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (token) {
    try {
      const oe = await fetch(
        `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(
          parsed.permalink
        )}&access_token=${token}`,
        { next: { revalidate: 0 } }
      );
      if (oe.ok) {
        const json = (await oe.json()) as {
          thumbnail_url?: string;
          title?: string;
        };
        if (json.thumbnail_url) {
          const local = await saveRemoteImage(json.thumbnail_url);
          return {
            coverUrl: local || json.thumbnail_url,
            caption: json.title || null,
            mediaTypeHint: parsed.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
          };
        }
      }
    } catch {
      /* continue */
    }
  }

  try {
    const res = await fetch(parsed.permalink, {
      headers: browserHeaders(),
      next: { revalidate: 0 },
      redirect: "follow",
    });
    if (res.ok) {
      const html = await res.text();
      const ogImage =
        html.match(
          /property=["']og:image["']\s+content=["']([^"']+)["']/i
        )?.[1] ||
        html.match(
          /content=["']([^"']+)["']\s+property=["']og:image["']/i
        )?.[1];
      const ogDesc =
        html.match(
          /property=["']og:description["']\s+content=["']([^"']+)["']/i
        )?.[1] || null;
      const ogType = html.match(
        /property=["']og:type["']\s+content=["']([^"']+)["']/i
      )?.[1];

      if (ogImage) {
        const decoded = ogImage.replace(/&amp;/g, "&");
        const local = await saveRemoteImage(decoded);
        return {
          coverUrl: local || decoded,
          caption: ogDesc,
          mediaTypeHint:
            ogType?.includes("video") || parsed.kind !== "p"
              ? "VIDEO"
              : "IMAGE",
        };
      }
    }
  } catch {
    /* continue */
  }

  return {
    coverUrl: null,
    caption: null,
    mediaTypeHint: parsed.mediaType,
  };
}

export type ProfileMediaItem = {
  permalink: string;
  shortcode: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL";
  caption: string | null;
  coverUrl: string | null;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  postedAt: Date | null;
  igMediaId: string | null;
};

function browserHeaders(extra: Record<string, string> = {}) {
  const session = process.env.INSTAGRAM_SESSION_ID?.trim();
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/json",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    Referer: "https://www.instagram.com/",
    ...extra,
  };
  if (session) {
    headers.Cookie = `sessionid=${session}; ds_user_id=1;`;
  }
  return headers;
}

function itemFromPermalink(
  permalink: string,
  extras: Partial<ProfileMediaItem> = {}
): ProfileMediaItem | null {
  const parsed = parseInstagramUrl(permalink);
  if (!parsed) return null;
  return {
    permalink: parsed.permalink,
    shortcode: parsed.shortcode,
    mediaType: parsed.mediaType,
    caption: extras.caption ?? null,
    coverUrl: extras.coverUrl ?? null,
    mediaUrl: extras.mediaUrl ?? null,
    thumbnailUrl: extras.thumbnailUrl ?? null,
    postedAt: extras.postedAt ?? null,
    igMediaId: extras.igMediaId ?? null,
  };
}

/** Converte texto com vários links em itens de galeria */
export function itemsFromPastedLinks(text: string): ProfileMediaItem[] {
  return extractInstagramPostUrls(text)
    .map((url) => itemFromPermalink(url))
    .filter((x): x is ProfileMediaItem => Boolean(x));
}

async function importViaGraph(
  username: string,
  limit: number
): Promise<ProfileMediaItem[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const userId = process.env.INSTAGRAM_USER_ID;
  if (!token || !userId) return null;

  const fields =
    "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
  let url: string | null =
    `https://graph.facebook.com/v21.0/${userId}/media?fields=${fields}&limit=${Math.min(
      limit,
      50
    )}&access_token=${token}`;
  const items: ProfileMediaItem[] = [];
  let pages = 0;
  while (url && pages < 5 && items.length < limit) {
    pages += 1;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        caption?: string;
        media_type: string;
        media_url?: string;
        permalink: string;
        thumbnail_url?: string;
        timestamp?: string;
      }>;
      paging?: { next?: string };
      error?: { message?: string };
    };
    if (!res.ok || json.error) {
      throw new Error(json.error?.message || "Falha na Graph API");
    }
    for (const item of json.data || []) {
      if (items.length >= limit) break;
      const mediaType =
        item.media_type === "VIDEO"
          ? "VIDEO"
          : item.media_type === "CAROUSEL_ALBUM"
            ? "CAROUSEL"
            : "IMAGE";
      const shortcode =
        shortcodeFromPermalinkSafe(item.permalink) || item.id;
      items.push({
        permalink: item.permalink,
        shortcode,
        mediaType,
        caption: item.caption || null,
        coverUrl: null,
        mediaUrl: item.media_url || null,
        thumbnailUrl: item.thumbnail_url || null,
        postedAt: item.timestamp ? new Date(item.timestamp) : null,
        igMediaId: item.id,
      });
    }
    url = json.paging?.next || null;
  }
  return items;
}

async function importViaWebApi(
  username: string,
  limit: number
): Promise<ProfileMediaItem[] | null> {
  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(
      username
    )}`,
    {
      headers: {
        ...browserHeaders({
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          "x-ig-app-id": "936619743392459",
          Accept: "*/*",
        }),
      },
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) return null;

  const json = (await res.json()) as {
    data?: {
      user?: {
        edge_owner_to_timeline_media?: {
          edges?: Array<{
            node: {
              id: string;
              shortcode: string;
              is_video?: boolean;
              edge_media_to_caption?: {
                edges?: Array<{ node?: { text?: string } }>;
              };
              taken_at_timestamp?: number;
            };
          }>;
        };
      };
    };
  };

  const edges =
    json.data?.user?.edge_owner_to_timeline_media?.edges || [];
  const items: ProfileMediaItem[] = [];
  for (const edge of edges.slice(0, limit)) {
    const n = edge.node;
    items.push({
      permalink: n.is_video
        ? `https://www.instagram.com/reel/${n.shortcode}/`
        : `https://www.instagram.com/p/${n.shortcode}/`,
      shortcode: n.shortcode,
      mediaType: n.is_video ? "VIDEO" : "IMAGE",
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text || null,
      coverUrl: null,
      mediaUrl: null,
      thumbnailUrl: null,
      postedAt: n.taken_at_timestamp
        ? new Date(n.taken_at_timestamp * 1000)
        : null,
      igMediaId: n.id,
    });
  }
  return items.length ? items : null;
}

/** Lê shortcodes embutidos no HTML do perfil */
async function importViaProfileHtml(
  username: string,
  limit: number
): Promise<ProfileMediaItem[] | null> {
  const res = await fetch(`https://www.instagram.com/${username}/`, {
    headers: browserHeaders(),
    next: { revalidate: 0 },
    redirect: "follow",
  });
  if (!res.ok) return null;
  const html = await res.text();
  const seen = new Set<string>();
  const items: ProfileMediaItem[] = [];
  const re = /\/(reel|p|tv)\/([A-Za-z0-9_-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && items.length < limit) {
    const kind = m[1] as "reel" | "p" | "tv";
    const code = m[2];
    if (seen.has(code)) continue;
    seen.add(code);
    const item = itemFromPermalink(
      `https://www.instagram.com/${kind}/${code}/`
    );
    if (item) items.push(item);
  }
  return items.length ? items : null;
}

async function importViaRss(
  username: string,
  limit: number
): Promise<ProfileMediaItem[] | null> {
  const feeds = [
    `https://rsshub.app/instagram/user/${encodeURIComponent(username)}`,
    `https://rsshub.rssforever.com/instagram/user/${encodeURIComponent(username)}`,
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed, {
        headers: {
          "User-Agent": "MajesteBot/1.0 (+https://equilibra.tech)",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<item") && !xml.includes("<entry")) continue;
      const urls = extractInstagramPostUrls(xml);
      const items = urls
        .slice(0, limit)
        .map((u) => itemFromPermalink(u))
        .filter((x): x is ProfileMediaItem => Boolean(x));
      if (items.length) return items;
    } catch {
      /* try next */
    }
  }
  return null;
}

const PROFILE_IMPORT_HELP =
  "O Instagram bloqueou a leitura automática do perfil neste servidor. Cole vários links de fotos/reels de uma vez na caixa abaixo (copie do Instagram → compartilhar → copiar link). Para sync automático, use conta Business com INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_USER_ID.";

/** Importa mídias do perfil — Graph API, HTML, RSS ou API web */
export async function importProfileMedia(
  profileUrlOrUser: string,
  limit = 24
): Promise<{ items: ProfileMediaItem[]; source: string; username: string }> {
  const username = usernameFromProfileUrl(profileUrlOrUser);
  if (!username) {
    throw new Error(
      "Link de perfil inválido. Ex: https://www.instagram.com/amajeste_/"
    );
  }

  const graph = await importViaGraph(username, limit);
  if (graph?.length) {
    return { items: graph, source: "graph", username };
  }

  const web = await importViaWebApi(username, limit);
  if (web?.length) {
    return { items: web, source: "web", username };
  }

  const html = await importViaProfileHtml(username, limit);
  if (html?.length) {
    return { items: html, source: "html", username };
  }

  const rss = await importViaRss(username, limit);
  if (rss?.length) {
    return { items: rss, source: "rss", username };
  }

  throw new Error(PROFILE_IMPORT_HELP);
}

function shortcodeFromPermalinkSafe(permalink: string) {
  return parseInstagramUrl(permalink)?.shortcode ?? null;
}
