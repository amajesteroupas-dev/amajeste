import { fontFamilyOf, type BannerTextStyle } from "@/lib/banner-text";

export type BannerArtKind = "headline" | "tagline" | "sparkle" | "line";

export type BannerArtLayer = {
  id: string;
  kind: BannerArtKind;
  x: number;
  y: number;
  text?: string;
  color?: string;
  fontId?: string;
  size?: number;
  bold?: boolean;
  scale?: number;
  rotation?: number;
};

const KINDS: BannerArtKind[] = ["headline", "tagline", "sparkle", "line"];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function uid() {
  return `art-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function parseArtLayers(raw: unknown): BannerArtLayer[] {
  if (!Array.isArray(raw)) return [];
  const out: BannerArtLayer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const kind = String(o.kind || "") as BannerArtKind;
    if (!KINDS.includes(kind)) continue;
    out.push({
      id: String(o.id || uid()),
      kind,
      x: clamp(Number(o.x ?? 50), 0, 100),
      y: clamp(Number(o.y ?? 50), 0, 100),
      text: typeof o.text === "string" ? o.text : undefined,
      color: typeof o.color === "string" ? o.color : undefined,
      fontId: typeof o.fontId === "string" ? o.fontId : undefined,
      size: Number.isFinite(Number(o.size))
        ? clamp(Number(o.size), 10, 160)
        : undefined,
      bold: o.bold === true,
      scale: Number.isFinite(Number(o.scale))
        ? clamp(Number(o.scale), 0.3, 3)
        : undefined,
      rotation: Number.isFinite(Number(o.rotation))
        ? clamp(Number(o.rotation), -45, 45)
        : undefined,
    });
    if (out.length >= 24) break;
  }
  return out;
}

export function artLayersFromStyle(
  textStyle: BannerTextStyle | null | undefined
): BannerArtLayer[] {
  return parseArtLayers(textStyle?.__artLayers);
}

export function withArtLayers(
  textStyle: BannerTextStyle | null | undefined,
  layers: BannerArtLayer[]
): BannerTextStyle {
  return { ...(textStyle || {}), __artLayers: layers };
}

export function artHasCopy(layers: BannerArtLayer[]) {
  return layers.some(
    (l) =>
      (l.kind === "headline" || l.kind === "tagline") &&
      Boolean(l.text?.trim())
  );
}

export function artFontFamily(fontId?: string) {
  return fontFamilyOf(fontId || "display");
}

export function newArtLayer(kind: BannerArtKind): BannerArtLayer {
  if (kind === "headline") {
    return {
      id: uid(),
      kind,
      x: 50,
      y: 42,
      text: "Viu,\namou,\nescolheu e...\narrasou!",
      color: "#ffffff",
      fontId: "display",
      size: 42,
      bold: true,
    };
  }
  if (kind === "tagline") {
    return {
      id: uid(),
      kind,
      x: 50,
      y: 72,
      text: "SEU ESTILO MERECE SER VIVIDO HOJE, NÃO AMANHÃ.",
      color: "#ffffff",
      fontId: "body",
      size: 11,
      bold: false,
    };
  }
  if (kind === "line") {
    return {
      id: uid(),
      kind,
      x: 50,
      y: 78,
      color: "#ffffff",
      scale: 1,
    };
  }
  return {
    id: uid(),
    kind: "sparkle",
    x: 28,
    y: 34,
    color: "#ffffff",
    scale: 1,
  };
}

/** Composição pronta no estilo da arte “Viu, amou… arrasou!”. */
export function arrasouArtPreset(): BannerArtLayer[] {
  return [
    {
      id: uid(),
      kind: "headline",
      x: 50,
      y: 40,
      text: "Viu,\namou,\nescolheu e...\narrasou!",
      color: "#ffffff",
      fontId: "display",
      size: 44,
      bold: true,
    },
    {
      id: uid(),
      kind: "tagline",
      x: 50,
      y: 71,
      text: "SEU ESTILO MERECE SER VIVIDO HOJE, NÃO AMANHÃ.",
      color: "#ffffff",
      fontId: "body",
      size: 11,
    },
    {
      id: uid(),
      kind: "line",
      x: 50,
      y: 77,
      color: "#ffffff",
      scale: 1,
    },
    { id: uid(), kind: "sparkle", x: 22, y: 28, color: "#ffffff", scale: 0.85 },
    { id: uid(), kind: "sparkle", x: 78, y: 32, color: "#ffffff", scale: 1.1 },
    { id: uid(), kind: "sparkle", x: 18, y: 58, color: "#ffffff", scale: 0.7 },
    { id: uid(), kind: "sparkle", x: 82, y: 62, color: "#ffffff", scale: 0.9 },
    { id: uid(), kind: "sparkle", x: 50, y: 18, color: "#ffffff", scale: 0.65 },
  ];
}

export const ART_KIND_LABEL: Record<BannerArtKind, string> = {
  headline: "Título",
  tagline: "Frase",
  sparkle: "Brilho",
  line: "Linha",
};
