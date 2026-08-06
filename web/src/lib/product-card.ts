import {
  colorToHex,
  isGenericColor,
  normalizeColor,
  pickImageForColor,
} from "@/lib/colors";
import { applyPriceAdjust } from "@/lib/promotion-pricing";

export type CardVariant = {
  size: string;
  color: string;
  colorHex?: string | null;
  stock?: number;
  active?: boolean;
};

export type CardImage = {
  url: string;
  alt?: string | null;
  sortOrder?: number;
};

/** Compact size label for card badges */
export function shortSizeLabel(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^únic|^unic/i.test(t)) return "Único";
  if (t.length <= 5) return t.toUpperCase();
  const first = t.split(/[\s(/]/)[0] || t;
  return first.slice(0, 5).toUpperCase();
}

/**
 * Only real sellable options: active + stock > 0, non-generic colors.
 * Cada cor tenta achar foto pelo alt/url; se não achar, recebe
 * a próxima imagem ainda não usada (ordem da galeria).
 */
export function buildProductCardProps(p: {
  id: string;
  name: string;
  slug: string;
  price: { toString(): string } | number | string;
  compareAt?: { toString(): string } | number | string | null;
  images: CardImage[];
  variants: CardVariant[];
  focusColor?: string | null;
  hrefExtra?: string;
  videoUrl?: string | null;
  /** Vídeos da categoria (+ opcional do produto). Preferir este campo. */
  videoUrls?: string[];
  /** Ajuste de preço da categoria (%). Negativo reduz, positivo aumenta. */
  priceAdjustPercent?: number | null;
  category?: { priceAdjustPercent?: number | null } | null;
}) {
  const sellable = p.variants.filter(
    (v) => (v.active !== false) && (v.stock == null || v.stock > 0)
  );

  const colors = [
    ...new Map(
      sellable
        .filter((v) => !isGenericColor(v.color))
        .map((v) => {
          const name = normalizeColor(v.color);
          return [
            name,
            {
              name,
              hex: v.colorHex || colorToHex(name),
              imageUrl: pickImageForColor(p.images, name) as string | null,
            },
          ] as const;
        })
    ).values(),
  ].map((c) => ({ ...c }));

  const used = new Set(
    colors.map((c) => c.imageUrl).filter((u): u is string => Boolean(u))
  );
  const leftover = p.images
    .map((img) => img.url)
    .filter((url) => url && !used.has(url));
  let li = 0;
  for (const c of colors) {
    if (!c.imageUrl && leftover[li]) {
      c.imageUrl = leftover[li++];
      used.add(c.imageUrl);
    }
  }

  // Cores ainda sem foto: reutilizam a primeira imagem (melhor que vazio)
  const fallback = p.images[0]?.url ?? null;
  for (const c of colors) {
    if (!c.imageUrl) c.imageUrl = fallback;
  }

  const sizeMap = new Map<string, string>();
  for (const v of sellable) {
    const short = shortSizeLabel(v.size);
    if (short && !sizeMap.has(short)) sizeMap.set(short, short);
  }
  const sizes = [...sizeMap.values()].slice(0, 6);

  const focus = p.focusColor ? normalizeColor(p.focusColor) : null;
  const primary =
    (focus && colors.find((c) => c.name === focus)?.imageUrl) ||
    colors[0]?.imageUrl ||
    fallback;

  const adjust =
    p.priceAdjustPercent ?? p.category?.priceAdjustPercent ?? 0;
  const rawPrice = Number(
    typeof p.price === "object" ? p.price.toString() : p.price
  );
  const adjustedPrice = applyPriceAdjust(rawPrice, adjust);
  const rawCompare =
    p.compareAt == null
      ? null
      : Number(
          typeof p.compareAt === "object"
            ? p.compareAt.toString()
            : p.compareAt
        );
  const adjustedCompare =
    rawCompare == null || !Number.isFinite(rawCompare)
      ? null
      : applyPriceAdjust(rawCompare, adjust);

  return {
    productId: p.id,
    name: p.name,
    slug: p.slug,
    price: adjustedPrice,
    compareAt: adjustedCompare,
    imageUrl: primary,
    colors,
    sizes,
    colorLabel: focus,
    hrefExtra: p.hrefExtra,
    videoUrls:
      p.videoUrls && p.videoUrls.length > 0
        ? p.videoUrls
        : p.videoUrl
          ? [p.videoUrl]
          : [],
  };
}
