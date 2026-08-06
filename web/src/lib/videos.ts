export type VideoPlayback =
  | { kind: "file"; src: string }
  | { kind: "embed"; src: string };

/** Resolve URL de arquivo, YouTube ou Vimeo para o player. */
export function resolveVideoPlayback(
  url: string | null | undefined
): VideoPlayback | null {
  if (!url?.trim()) return null;
  const u = url.trim();

  const yt = u.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  if (yt) {
    return {
      kind: "embed",
      src: `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`,
    };
  }

  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    return {
      kind: "embed",
      src: `https://player.vimeo.com/video/${vm[1]}?autoplay=1`,
    };
  }

  if (
    u.startsWith("/uploads/") ||
    /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(u)
  ) {
    return { kind: "file", src: u };
  }

  // URL direta de arquivo (CDN) sem extensão clara
  if (/^https?:\/\//i.test(u)) {
    return { kind: "file", src: u };
  }

  return null;
}

export function hasProductVideo(url: string | null | undefined) {
  return Boolean(resolveVideoPlayback(url));
}

export function hasAnyProductVideo(urls: string[] | null | undefined) {
  return Boolean(urls?.some((u) => resolveVideoPlayback(u)));
}

/** Une vídeo do produto (se houver) + vídeos da categoria, sem duplicar. */
export function mergeProductVideoUrls(
  productVideoUrl: string | null | undefined,
  categoryUrls: string[] | undefined
): string[] {
  const out: string[] = [];
  const push = (u?: string | null) => {
    const t = u?.trim();
    if (!t || !resolveVideoPlayback(t) || out.includes(t)) return;
    out.push(t);
  };
  push(productVideoUrl);
  for (const u of categoryUrls || []) push(u);
  return out;
}

/** Escolhe um URL aleatório, evitando repetir o atual se houver mais de um. */
export function pickRandomVideoUrl(
  urls: string[],
  avoid?: string | null
): string | null {
  const valid = urls.filter((u) => resolveVideoPlayback(u));
  if (valid.length === 0) return null;
  if (valid.length === 1) return valid[0];
  const pool = avoid ? valid.filter((u) => u !== avoid) : valid;
  const list = pool.length > 0 ? pool : valid;
  return list[Math.floor(Math.random() * list.length)] || null;
}
