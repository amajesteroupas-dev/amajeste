/** Camadas de modelos no banner (posição + escala) */
export type CutoutLayer = {
  url: string;
  /** centro horizontal % (0–100) */
  x: number;
  /** deslocamento vertical a partir da base % (0 = no chão, sobe até 40) */
  y: number;
  /** escala relativa (0.45–1.8) */
  scale: number;
};

export function clampCutout(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function defaultCutoutLayout(count: number, index: number): Pick<
  CutoutLayer,
  "x" | "y" | "scale"
> {
  const n = Math.max(1, count);
  return {
    x: ((index + 0.5) / n) * 100,
    y: 0,
    scale: 1,
  };
}

/** Aceita string[] legado ou objetos com posição */
export function parseCutoutLayers(v: unknown): CutoutLayer[] {
  if (!Array.isArray(v)) return [];
  const urls: string[] = [];
  const raw: Array<Partial<CutoutLayer> & { url?: string }> = [];

  for (const item of v) {
    if (typeof item === "string" && item) {
      urls.push(item);
      raw.push({ url: item });
    } else if (item && typeof item === "object" && "url" in item) {
      const url = String((item as { url: unknown }).url || "");
      if (!url) continue;
      urls.push(url);
      raw.push(item as Partial<CutoutLayer> & { url: string });
    }
  }

  return raw.slice(0, 6).map((item, i, arr) => {
    const fallback = defaultCutoutLayout(arr.length, i);
    return {
      url: String(item.url),
      x: clampCutout(
        Number(item.x ?? fallback.x),
        0,
        100
      ),
      y: clampCutout(Number(item.y ?? fallback.y), 0, 45),
      scale: clampCutout(Number(item.scale ?? fallback.scale), 0.45, 1.8),
    };
  });
}

export function cutoutUrls(layers: CutoutLayer[]): string[] {
  return layers.map((l) => l.url);
}

export function serializeCutoutLayers(layers: CutoutLayer[]): CutoutLayer[] {
  return parseCutoutLayers(layers);
}

/** Redistribui X igualmente mantendo y/scale */
export function redistributeCutouts(layers: CutoutLayer[]): CutoutLayer[] {
  return layers.map((l, i, arr) => ({
    ...l,
    ...defaultCutoutLayout(arr.length, i),
    y: l.y,
    scale: l.scale,
  }));
}

export function upsertCutoutUrl(
  layers: CutoutLayer[],
  url: string,
  max = 6
): CutoutLayer[] {
  if (layers.some((l) => l.url === url)) {
    return layers.filter((l) => l.url !== url);
  }
  if (layers.length >= max) return layers;
  const next = [
    ...layers,
    { url, ...defaultCutoutLayout(layers.length + 1, layers.length) },
  ];
  return redistributeCutouts(next);
}

/** Só adiciona (não remove se já existir) — usado no botão Selecionar */
export function addCutoutUrl(
  layers: CutoutLayer[],
  url: string,
  max = 6
): CutoutLayer[] {
  if (layers.some((l) => l.url === url) || layers.length >= max) return layers;
  const next = [
    ...layers,
    { url, ...defaultCutoutLayout(layers.length + 1, layers.length) },
  ];
  return redistributeCutouts(next);
}

export function replaceCutoutUrl(
  layers: CutoutLayer[],
  oldUrl: string,
  newUrl: string
): CutoutLayer[] {
  return layers.map((l) => (l.url === oldUrl ? { ...l, url: newUrl } : l));
}
