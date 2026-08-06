export type BannerVideoClip = {
  url: string;
  seconds: number;
  /** Enquadramento individual (lado a lado / por clipe) */
  focalX?: number;
  focalY?: number;
  zoom?: number;
  /** Vídeo com fundo removido (só o corpo) */
  cutout?: boolean;
};

export type BannerVideoLayout = "sequence" | "pair";

const MAX_CLIPS = 3;

function clampNum(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function clampVideoSeconds(n: unknown, fallback = 8) {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(60, Math.max(2, v));
}

export function parseVideoLayout(value: unknown): BannerVideoLayout {
  return value === "pair" ? "pair" : "sequence";
}

function optionalFocal(n: unknown, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return clampNum(v, 0, 100);
}

function optionalZoom(n: unknown, fallback = 1) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return clampNum(v, 0.5, 3);
}

function clipFromObject(o: Record<string, unknown>): BannerVideoClip | null {
  const url = String(o.url || "").trim();
  if (!url) return null;
  const clip: BannerVideoClip = {
    url,
    seconds: clampVideoSeconds(o.seconds, 8),
  };
  if (o.focalX !== undefined && o.focalX !== null) {
    clip.focalX = optionalFocal(o.focalX, 50);
  }
  if (o.focalY !== undefined && o.focalY !== null) {
    clip.focalY = optionalFocal(o.focalY, 50);
  }
  if (o.zoom !== undefined && o.zoom !== null) {
    clip.zoom = optionalZoom(o.zoom, 1);
  }
  if (o.cutout === true || /\/video-cutout-bank\//.test(url)) {
    clip.cutout = true;
  }
  return clip;
}

export function isCutoutVideoUrl(url: string) {
  return /\/video-cutout-bank\//.test(url);
}

/** GIF/WebP animado — usar <img>; WebM/MP4 — <video> */
export function isAnimatedImageCutout(url: string) {
  return /\.(gif|webp)(\?|$)/i.test(url);
}

/** Aceita playlist JSON ou o par legado videoUrl/videoSeconds. */
export function parseBannerVideos(
  playlist: unknown,
  legacyUrl?: string | null,
  legacySeconds?: number | null
): BannerVideoClip[] {
  const out: BannerVideoClip[] = [];

  if (Array.isArray(playlist)) {
    for (const item of playlist) {
      if (typeof item === "string" && item.trim()) {
        out.push({ url: item.trim(), seconds: 8, focalX: 50, focalY: 50, zoom: 1 });
      } else if (item && typeof item === "object" && "url" in item) {
        const clip = clipFromObject(item as Record<string, unknown>);
        if (clip) out.push(clip);
      }
      if (out.length >= MAX_CLIPS) break;
    }
  }

  if (out.length === 0) {
    const url = (legacyUrl || "").trim();
    if (url) {
      out.push({
        url,
        seconds: clampVideoSeconds(legacySeconds, 8),
        focalX: 50,
        focalY: 50,
        zoom: 1,
      });
    }
  }

  return out;
}

export function normalizeBannerVideos(input: unknown): BannerVideoClip[] {
  return parseBannerVideos(input).slice(0, MAX_CLIPS);
}

export function getClipFrame(
  clip: BannerVideoClip,
  fallback?: { focalX?: number; focalY?: number; imageZoom?: number }
) {
  return {
    focalX: optionalFocal(clip.focalX, fallback?.focalX ?? 50),
    focalY: optionalFocal(clip.focalY, fallback?.focalY ?? 50),
    zoom: optionalZoom(clip.zoom, fallback?.imageZoom ?? 1),
  };
}

export const BANNER_VIDEO_MAX = MAX_CLIPS;
