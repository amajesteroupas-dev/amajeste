import type { CSSProperties, ReactNode } from "react";
import { createElement } from "react";

export type TextLayerKey =
  | "title"
  | "subtitle"
  | "highlight"
  | "promo"
  | "tagline"
  | "cta";

/** Estilo de um trecho (como seleção no Word) */
export type TextRunStyle = {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  /** Contorno da letra */
  strokeColor?: string;
  /** Espessura do contorno em px (0 = sem) */
  strokeWidth?: number;
};

export type TextRun = TextRunStyle & { text: string };

export type TextLayerStyle = {
  font?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  uppercase?: boolean;
  letterSpacing?: number;
  /** Contorno da letra */
  strokeColor?: string;
  /** Espessura do contorno em px (0 = sem) */
  strokeWidth?: number;
  /** Botão CTA — fundo */
  bgColor?: string;
  /** Botão CTA — borda do botão */
  borderColor?: string;
  /** Botão CTA — raio em px */
  borderRadius?: number;
  /** Botão CTA — padding horizontal px */
  paddingX?: number;
  /** Botão CTA — padding vertical px */
  paddingY?: number;
  /** Trechos com estilo próprio (ex.: só o "10" maior) */
  runs?: TextRun[];
};

export const STROKE_WIDTHS = [
  { value: 0, label: "Sem" },
  { value: 1, label: "Fino" },
  { value: 2, label: "Médio" },
  { value: 3, label: "Grosso" },
  { value: 4, label: "Extra" },
];

export const STROKE_COLORS = [
  "#000000",
  "#ffffff",
  "#5c4336",
  "#a85f64",
  "#c9a24a",
  "#1a2744",
];

export type BannerTextStyle = Partial<Record<TextLayerKey, TextLayerStyle>>;

export type TextSelection = { start: number; end: number };

export const BANNER_FONTS: {
  id: string;
  label: string;
  family: string;
  preview?: string;
}[] = [
  {
    id: "display",
    label: "Cormorant (clássica)",
    family: "var(--font-display), Georgia, serif",
  },
  {
    id: "playfair",
    label: "Playfair (elegante)",
    family: "var(--font-playfair), Georgia, serif",
  },
  {
    id: "lora",
    label: "Lora (serif moderna)",
    family: "var(--font-lora), Georgia, serif",
  },
  {
    id: "body",
    label: "Manrope (limpa)",
    family: "var(--font-body), system-ui, sans-serif",
  },
  {
    id: "montserrat",
    label: "Montserrat (moderna)",
    family: "var(--font-montserrat), system-ui, sans-serif",
  },
  {
    id: "oswald",
    label: "Oswald (impacto)",
    family: "var(--font-oswald), Impact, sans-serif",
  },
  {
    id: "bebas",
    label: "Bebas (títulos)",
    family: "var(--font-bebas), Impact, sans-serif",
  },
  {
    id: "script",
    label: "Great Vibes (script)",
    family: "var(--font-script), cursive",
  },
];

export const FONT_SIZES = [
  14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 84, 96, 120, 144,
];

export const TEXT_COLORS = [
  "#5c4336",
  "#2a2420",
  "#1a2744",
  "#000000",
  "#ffffff",
  "#f4efe8",
  "#a85f64",
  "#c9a24a",
  "#4a4038",
  "#8a7468",
];

export const CTA_BG_COLORS = [
  "#a85f64",
  "#c9a24a",
  "#1a2744",
  "#2a2420",
  "#3d2e28",
  "#8a5a5e",
  "#1a1a1a",
  "#ffffff",
  "#f4efe8",
  "#5c4336",
];

const DEFAULTS: Record<TextLayerKey, TextLayerStyle> = {
  title: {
    font: "display",
    size: 48,
    bold: false,
    italic: false,
    uppercase: true,
    color: "#5c4336",
  },
  subtitle: {
    font: "body",
    size: 16,
    bold: false,
    italic: false,
    color: "#4a4038",
  },
  highlight: {
    font: "display",
    size: 56,
    bold: true,
    italic: false,
    color: "#c9a24a",
  },
  promo: {
    font: "body",
    size: 15,
    bold: false,
    italic: false,
    color: "#4a4038",
  },
  tagline: {
    font: "body",
    size: 11,
    bold: false,
    uppercase: true,
    letterSpacing: 0.35,
    color: "#8a8a8a",
  },
  cta: {
    font: "body",
    size: 13,
    bold: true,
    uppercase: true,
    color: "#ffffff",
    bgColor: "#a85f64",
    borderColor: "transparent",
    borderRadius: 0,
    paddingX: 22,
    paddingY: 12,
  },
};

type CharCell = TextRunStyle & { ch: string };

function styleKey(s: TextRunStyle) {
  return [
    s.font ?? "",
    s.size ?? "",
    s.bold === undefined ? "" : s.bold ? "1" : "0",
    s.italic === undefined ? "" : s.italic ? "1" : "0",
    s.underline === undefined ? "" : s.underline ? "1" : "0",
    s.color ?? "",
    s.strokeColor ?? "",
    s.strokeWidth ?? "",
  ].join("|");
}

function runStyleFromCell(c: CharCell): TextRunStyle {
  return {
    font: c.font,
    size: c.size,
    bold: c.bold,
    italic: c.italic,
    underline: c.underline,
    color: c.color,
    strokeColor: c.strokeColor,
    strokeWidth: c.strokeWidth,
  };
}

function expandRuns(runs: TextRun[]): CharCell[] {
  const out: CharCell[] = [];
  for (const r of runs) {
    for (const ch of Array.from(r.text)) {
      out.push({
        ch,
        font: r.font,
        size: r.size,
        bold: r.bold,
        italic: r.italic,
        underline: r.underline,
        color: r.color,
        strokeColor: r.strokeColor,
        strokeWidth: r.strokeWidth,
      });
    }
  }
  return out;
}

function collapseChars(chars: CharCell[]): TextRun[] {
  if (!chars.length) return [];
  const runs: TextRun[] = [];
  let cur: TextRun = {
    text: chars[0].ch,
    ...runStyleFromCell(chars[0]),
  };
  let curKey = styleKey(chars[0]);
  for (let i = 1; i < chars.length; i++) {
    const c = chars[i];
    const k = styleKey(c);
    if (k === curKey) {
      cur.text += c.ch;
    } else {
      runs.push(cur);
      cur = {
        text: c.ch,
        ...runStyleFromCell(c),
      };
      curKey = k;
    }
  }
  runs.push(cur);
  return runs;
}

export function plainFromRuns(runs?: TextRun[] | null): string {
  return (runs || []).map((r) => r.text).join("");
}

export function runsForText(
  text: string,
  existing?: TextRun[] | null
): TextRun[] {
  if (!text) return [];
  const prev = existing?.length ? existing : null;
  if (!prev) return [{ text }];
  const prevPlain = plainFromRuns(prev);
  if (prevPlain === text) return collapseChars(expandRuns(prev));

  // Preserva estilos no prefixo/sufixo comum ao editar o texto
  let p = 0;
  while (
    p < prevPlain.length &&
    p < text.length &&
    prevPlain[p] === text[p]
  ) {
    p++;
  }
  let s = 0;
  while (
    s < prevPlain.length - p &&
    s < text.length - p &&
    prevPlain[prevPlain.length - 1 - s] === text[text.length - 1 - s]
  ) {
    s++;
  }

  const chars = expandRuns(prev);
  const prefix = chars.slice(0, p);
  const suffix = chars.slice(prevPlain.length - s);
  const midText = text.slice(p, text.length - s);
  const midBase = chars[Math.min(p, chars.length - 1)] || {};
  const mid: CharCell[] = Array.from(midText).map((ch) => ({
    ch,
    font: midBase.font,
    size: midBase.size,
    bold: midBase.bold,
    italic: midBase.italic,
    underline: midBase.underline,
    color: midBase.color,
    strokeColor: midBase.strokeColor,
    strokeWidth: midBase.strokeWidth,
  }));
  return collapseChars([...prefix, ...mid, ...suffix]);
}

export function applyStyleToSelection(
  runs: TextRun[],
  start: number,
  end: number,
  patch: TextRunStyle
): TextRun[] {
  if (start >= end || !runs.length) return runs;
  const chars = expandRuns(runs);
  const a = Math.max(0, Math.min(start, chars.length));
  const b = Math.max(a, Math.min(end, chars.length));
  for (let i = a; i < b; i++) {
    if (patch.font !== undefined) chars[i].font = patch.font;
    if (patch.size !== undefined) chars[i].size = patch.size;
    if (patch.bold !== undefined) chars[i].bold = patch.bold;
    if (patch.italic !== undefined) chars[i].italic = patch.italic;
    if (patch.underline !== undefined) chars[i].underline = patch.underline;
    if (patch.color !== undefined) chars[i].color = patch.color;
    if (patch.strokeColor !== undefined) chars[i].strokeColor = patch.strokeColor;
    if (patch.strokeWidth !== undefined) chars[i].strokeWidth = patch.strokeWidth;
  }
  return collapseChars(chars);
}

export function effectiveRuns(
  layer: TextLayerStyle,
  plainText: string
): TextRun[] {
  if (!plainText) return [];
  const synced = runsForText(plainText, layer.runs);
  if (synced.length) return synced;
  return [{ text: plainText }];
}

export function selectionStyle(
  runs: TextRun[],
  start: number,
  end: number
): TextRunStyle | null {
  if (start >= end) return null;
  const chars = expandRuns(runs);
  const a = Math.max(0, Math.min(start, chars.length));
  const b = Math.max(a, Math.min(end, chars.length));
  if (a >= b) return null;
  const first = chars[a];
  const style: TextRunStyle = {
    font: first.font,
    size: first.size,
    bold: first.bold,
    italic: first.italic,
    underline: first.underline,
    color: first.color,
    strokeColor: first.strokeColor,
    strokeWidth: first.strokeWidth,
  };
  for (let i = a + 1; i < b; i++) {
    const c = chars[i];
    if (c.font !== style.font) style.font = undefined;
    if (c.size !== style.size) style.size = undefined;
    if (c.bold !== style.bold) style.bold = undefined;
    if (c.italic !== style.italic) style.italic = undefined;
    if (c.underline !== style.underline) style.underline = undefined;
    if (c.color !== style.color) style.color = undefined;
    if (c.strokeColor !== style.strokeColor) style.strokeColor = undefined;
    if (c.strokeWidth !== style.strokeWidth) style.strokeWidth = undefined;
  }
  return style;
}

export function getLayerStyle(
  textStyle: BannerTextStyle | null | undefined,
  key: TextLayerKey
): TextLayerStyle {
  return { ...DEFAULTS[key], ...(textStyle?.[key] || {}) };
}

export function fontFamilyOf(fontId?: string) {
  return (
    BANNER_FONTS.find((f) => f.id === fontId)?.family ||
    BANNER_FONTS[0].family
  );
}

function sizeClamp(size: number): string {
  return `clamp(${Math.max(12, size * 0.55)}px, ${size * 0.12}vw, ${size}px)`;
}

/** Contorno (borda) das letras via -webkit-text-stroke */
export function cssFromStroke(
  strokeColor?: string,
  strokeWidth?: number,
  opts?: { scale?: number; clear?: boolean }
): CSSProperties {
  const scale = opts?.scale ?? 1;
  const width = (strokeWidth ?? 0) * scale;
  if (!width || width <= 0) {
    if (opts?.clear) {
      return {
        WebkitTextStroke: "0px transparent",
        paintOrder: "normal",
      };
    }
    return {};
  }
  return {
    WebkitTextStroke: `${width}px ${strokeColor || "#000000"}`,
    paintOrder: "stroke fill",
  };
}

export function cssFromLayer(
  layer: TextLayerStyle,
  opts?: { scale?: number }
): CSSProperties {
  const scale = opts?.scale ?? 1;
  const size = (layer.size || 16) * scale;
  return {
    fontFamily: fontFamilyOf(layer.font),
    fontSize: sizeClamp(size),
    fontWeight: layer.bold ? 700 : 400,
    fontStyle: layer.italic ? "italic" : "normal",
    textDecoration: layer.underline ? "underline" : "none",
    color: layer.color || undefined,
    textTransform: layer.uppercase ? "uppercase" : "none",
    letterSpacing:
      layer.letterSpacing !== undefined
        ? `${layer.letterSpacing}em`
        : undefined,
    ...cssFromStroke(layer.strokeColor, layer.strokeWidth, opts),
  };
}

/** Estilo completo do botão “Comprar agora” (texto + fundo + padding). */
export function cssFromCtaButton(
  layer: TextLayerStyle,
  opts?: { scale?: number }
): CSSProperties {
  const scale = opts?.scale ?? 1;
  const text = cssFromLayer(layer, opts);
  const padY = (layer.paddingY ?? 12) * scale;
  const padX = (layer.paddingX ?? 22) * scale;
  return {
    ...text,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: layer.bgColor || "#a85f64",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: layer.borderColor || "transparent",
    borderRadius:
      layer.borderRadius !== undefined ? layer.borderRadius : 0,
    padding: `${padY}px ${padX}px`,
    lineHeight: 1.25,
    textDecoration: layer.underline ? "underline" : "none",
    cursor: "pointer",
    boxSizing: "border-box",
  };
}

/** CSS de um trecho em cima do estilo base da camada */
export function cssFromRun(
  layer: TextLayerStyle,
  run: TextRun,
  opts?: { scale?: number }
): CSSProperties {
  const scale = opts?.scale ?? 1;
  const size =
    run.size !== undefined
      ? run.size * scale
      : undefined;
  const strokeColor =
    run.strokeColor !== undefined ? run.strokeColor : undefined;
  const strokeWidth =
    run.strokeWidth !== undefined ? run.strokeWidth : undefined;
  const strokeOverride =
    strokeColor !== undefined || strokeWidth !== undefined
      ? cssFromStroke(
          strokeColor ?? layer.strokeColor,
          strokeWidth ?? layer.strokeWidth ?? 0,
          {
            ...opts,
            clear: (strokeWidth ?? layer.strokeWidth ?? 0) <= 0,
          }
        )
      : {};
  return {
    fontFamily: run.font ? fontFamilyOf(run.font) : undefined,
    fontSize: size !== undefined ? sizeClamp(size) : undefined,
    fontWeight:
      run.bold !== undefined ? (run.bold ? 700 : 400) : undefined,
    fontStyle:
      run.italic !== undefined
        ? run.italic
          ? "italic"
          : "normal"
        : undefined,
    textDecoration:
      run.underline !== undefined
        ? run.underline
          ? "underline"
          : "none"
        : undefined,
    color: run.color,
    ...strokeOverride,
  };
}

export function hasCustomRuns(layer: TextLayerStyle, plainText: string) {
  const runs = effectiveRuns(layer, plainText);
  return runs.some(
    (r) =>
      r.size !== undefined ||
      r.font !== undefined ||
      r.bold !== undefined ||
      r.italic !== undefined ||
      r.underline !== undefined ||
      r.color !== undefined ||
      r.strokeColor !== undefined ||
      r.strokeWidth !== undefined
  );
}

/** Renderiza texto com trechos estilizados */
export function renderLayerText(
  layer: TextLayerStyle,
  plainText: string,
  opts?: { scale?: number }
): ReactNode {
  if (!plainText) return null;
  const runs = effectiveRuns(layer, plainText);
  const custom = hasCustomRuns(layer, plainText);
  if (!custom) return plainText;
  return runs.map((run, i) =>
    createElement(
      "span",
      { key: i, style: cssFromRun(layer, run, opts) },
      run.text
    )
  );
}

export function parseTextStyle(raw: unknown): BannerTextStyle {
  if (!raw || typeof raw !== "object") return {};
  return raw as BannerTextStyle;
}
