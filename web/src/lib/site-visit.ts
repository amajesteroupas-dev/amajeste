import { createHash } from "crypto";

export type DeviceType = "mobile" | "desktop" | "tablet" | "unknown";

const SALT =
  process.env.SITE_VISIT_SALT ||
  process.env.NEXTAUTH_SECRET ||
  "majeste-site-visit-salt";

export function hashIp(ip: string | null | undefined): string {
  const raw = (ip || "unknown").trim().toLowerCase();
  return createHash("sha256").update(`${SALT}:${raw}`).digest("hex");
}

/** Prefixo parcial para visão admin (não identifica o IP completo). */
export function ipPrefix(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.*`;
  // IPv6: primeiros 4 grupos
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean).slice(0, 4);
    if (parts.length) return `${parts.join(":")}:*`;
  }
  return null;
}

export function requestClientIp(req: Request | { headers: Headers }): string | null {
  try {
    const h = req.headers;
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]?.trim() || null;
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

export function deviceFromUserAgent(ua: string | null | undefined): DeviceType {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (
    /ipad|tablet|kindle|silk|playbook|(android(?!.*mobile))/.test(s)
  ) {
    return "tablet";
  }
  if (
    /mobi|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|iemobile/.test(
      s
    )
  ) {
    return "mobile";
  }
  if (/mozilla|chrome|safari|firefox|edg|opr|windows|macintosh|linux/.test(s)) {
    return "desktop";
  }
  return "unknown";
}

export function shouldTrackPath(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/_next")) return false;
  if (path.startsWith("/uploads")) return false;
  if (/\.(ico|png|jpe?g|webp|avif|gif|svg|css|js|map|woff2?|ttf|txt|xml)$/i.test(path)) {
    return false;
  }
  return true;
}

export function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
