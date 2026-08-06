/** Helpers para posts do Instagram (@amajeste_) */

export type IgMediaType = "IMAGE" | "VIDEO" | "CAROUSEL";

export type ParsedIgPost = {
  shortcode: string;
  mediaType: IgMediaType;
  permalink: string;
  embedUrl: string;
  kind: "p" | "reel" | "tv";
};

export function parseInstagramUrl(input: string): ParsedIgPost | null {
  try {
    const raw = input.trim();
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!u.hostname.replace(/^www\./, "").endsWith("instagram.com")) {
      return null;
    }
    const parts = u.pathname.split("/").filter(Boolean);
    const kind = parts[0] as "p" | "reel" | "tv" | string;
    const code = parts[1]?.replace(/\/$/, "");
    if (!code || !["p", "reel", "tv"].includes(kind)) return null;

    const mediaType: IgMediaType =
      kind === "p" ? "IMAGE" : "VIDEO";

    return {
      shortcode: code,
      mediaType,
      permalink: `https://www.instagram.com/${kind}/${code}/`,
      embedUrl: `https://www.instagram.com/${kind}/${code}/embed`,
      kind: kind as "p" | "reel" | "tv",
    };
  } catch {
    return null;
  }
}

export function embedUrlFromPermalink(permalink: string) {
  const parsed = parseInstagramUrl(permalink);
  return parsed?.embedUrl ?? null;
}

export function mapGraphMediaType(t: string): IgMediaType {
  const u = (t || "").toUpperCase();
  if (u === "VIDEO") return "VIDEO";
  if (u === "CAROUSEL_ALBUM") return "CAROUSEL";
  return "IMAGE";
}

export function shortcodeFromPermalink(permalink: string) {
  return parseInstagramUrl(permalink)?.shortcode ?? null;
}
