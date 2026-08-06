/**
 * Helpers compartilhados pelas APIs de catálogo do app mobile / loja.
 */

import { applyPriceAdjust } from "@/lib/promotion-pricing";

export function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://amajeste.com.br"
  ).replace(/\/$/, "");
}

export function absoluteMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${siteBaseUrl()}${url}`;
  return `${siteBaseUrl()}/${url}`;
}

export function money(value: { toString(): string } | number | string | null | undefined) {
  if (value == null) return null;
  return Number(typeof value === "object" ? value.toString() : value);
}

export const productListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  compareAt: true,
  featured: true,
  destaque: true,
  installmentsMax: true,
  interestFree: true,
  pixDiscountPercent: true,
  showPaymentFlags: true,
  videoUrl: true,
  weightKg: true,
  lengthCm: true,
  widthCm: true,
  heightCm: true,
  categoryId: true,
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      priceAdjustPercent: true,
      parent: { select: { id: true, name: true, slug: true } },
    },
  },
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, alt: true, sortOrder: true, isPrimary: true },
  },
  variants: {
    where: { active: true },
    orderBy: { size: "asc" as const },
    select: {
      id: true,
      sku: true,
      size: true,
      color: true,
      colorHex: true,
      stock: true,
      price: true,
      active: true,
    },
  },
} as const;

export function serializeProduct(
  p: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: { toString(): string } | number;
    compareAt?: { toString(): string } | number | null;
    featured: boolean;
    destaque: boolean;
    installmentsMax: number;
    interestFree: boolean;
    pixDiscountPercent: number;
    showPaymentFlags: boolean;
    videoUrl?: string | null;
    weightKg?: number | null;
    lengthCm?: number | null;
    widthCm?: number | null;
    heightCm?: number | null;
    categoryId: string;
    category: {
      id: string;
      name: string;
      slug: string;
      parentId: string | null;
      priceAdjustPercent?: number | null;
      parent: { id: string; name: string; slug: string } | null;
    };
    images: {
      id: string;
      url: string;
      alt: string | null;
      sortOrder: number;
      isPrimary: boolean;
    }[];
    variants: {
      id: string;
      sku: string;
      size: string;
      color: string;
      colorHex: string | null;
      stock: number;
      price: { toString(): string } | number | null;
      active: boolean;
    }[];
  },
  opts?: { fullDescription?: boolean }
) {
  const images = p.images.map((img) => ({
    ...img,
    url: absoluteMediaUrl(img.url) || img.url,
  }));
  const primary =
    images.find((i) => i.isPrimary)?.url || images[0]?.url || null;

  const adjust = p.category.priceAdjustPercent ?? 0;
  const basePrice = money(p.price) ?? 0;
  const baseCompare = money(p.compareAt);

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: opts?.fullDescription
      ? p.description
      : p.description.slice(0, 280),
    price: applyPriceAdjust(basePrice, adjust),
    compareAt:
      baseCompare == null ? null : applyPriceAdjust(baseCompare, adjust),
    featured: p.featured,
    destaque: p.destaque,
    installmentsMax: p.installmentsMax,
    interestFree: p.interestFree,
    pixDiscountPercent: p.pixDiscountPercent,
    showPaymentFlags: p.showPaymentFlags,
    videoUrl: absoluteMediaUrl(p.videoUrl) || p.videoUrl || null,
    imageUrl: primary,
    images,
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
      priceAdjustPercent: adjust,
      parent: p.category.parent,
    },
    shipping: {
      weightKg: p.weightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
    },
    variants: p.variants.map((v) => {
      const vp = money(v.price) ?? money(p.price) ?? 0;
      return {
        id: v.id,
        sku: v.sku,
        size: v.size,
        color: v.color,
        colorHex: v.colorHex,
        stock: v.stock,
        price: applyPriceAdjust(vp, adjust),
        active: v.active,
      };
    }),
  };
}
