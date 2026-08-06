import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  absoluteMediaUrl,
  productListSelect,
  serializeProduct,
} from "@/lib/catalog-api";
import { getActiveSitePromotion, getLivePromotions, pickBestPromotion } from "@/lib/promotion-settings";

export const dynamic = "force-dynamic";

/** Home do app: banners + Majesté + Destaques + categorias. */
export async function GET() {
  const [banners, featured, destaques, categories, sitePromo, promotions] =
    await Promise.all([
      prisma.banner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        take: 12,
      }),
      prisma.product.findMany({
        where: { deletedAt: null, active: true, featured: true },
        select: productListSelect,
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.product.findMany({
        where: { deletedAt: null, active: true, destaque: true },
        select: productListSelect,
        orderBy: { updatedAt: "desc" },
        take: 12,
      }),
      prisma.category.findMany({
        where: { parentId: null, slug: { not: "pagina-principal" } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          children: {
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              imageUrl: true,
              sortOrder: true,
            },
          },
        },
      }),
      getActiveSitePromotion(),
      getLivePromotions(),
    ]);

  const pixOffer = pickBestPromotion(promotions, {
    isPix: true,
    isCard: false,
    installments: 1,
  });
  const card1x = pickBestPromotion(promotions, {
    isPix: false,
    isCard: true,
    installments: 1,
  });

  return NextResponse.json({
    sitePromo: {
      active: sitePromo.active,
      percent: sitePromo.active ? sitePromo.percent : 0,
      endsAt: sitePromo.endsAt,
      label: sitePromo.label,
      pixPercentIncluded: sitePromo.pixPercentIncluded,
      promotions,
      pixOfferPercent: pixOffer?.percent || 0,
      card1xOfferPercent: card1x?.percent || 0,
    },
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title,
      subtitle: b.subtitle,
      ctaLabel: b.ctaLabel,
      ctaHref: b.ctaHref,
      imageUrl: absoluteMediaUrl(b.imageUrl),
      highlight: b.highlight,
      promoText: b.promoText,
      couponCode: b.couponCode,
      tagline: b.tagline,
      layout: b.layout,
    })),
    featured: featured.map((p) => serializeProduct(p)),
    destaques: destaques.map((p) => serializeProduct(p)),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: absoluteMediaUrl(c.imageUrl),
      children: c.children.map((ch) => ({
        ...ch,
        imageUrl: absoluteMediaUrl(ch.imageUrl),
      })),
    })),
  });
}
