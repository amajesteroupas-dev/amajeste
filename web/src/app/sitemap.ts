import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://amajeste.com.br";

  let products: { slug: string; updatedAt: Date }[] = [];
  let categories: { slug: string; updatedAt: Date }[] = [];

  try {
    [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
  } catch {
    // DB may be unavailable during build
  }

  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/contato`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/politicas-de-troca`, changeFrequency: "yearly", priority: 0.3 },
    ...categories.map((c) => ({
      url: `${base}/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/produto/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
