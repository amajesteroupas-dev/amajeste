import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productListSelect, serializeProduct } from "@/lib/catalog-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = String(sp.get("q") || "").trim();
  const categorySlug = String(sp.get("category") || "").trim();
  const featured = sp.get("featured") === "1";
  const destaque = sp.get("destaque") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(sp.get("limit") || 24)));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    deletedAt: null,
    active: true,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (featured) where.featured = true;
  if (destaque) where.destaque = true;

  if (categorySlug) {
    const cat = await prisma.category.findUnique({
      where: { slug: categorySlug },
      include: { children: { select: { id: true } } },
    });
    if (!cat) {
      return NextResponse.json({ products: [], total: 0, page, limit });
    }
    const ids = [cat.id, ...cat.children.map((c) => c.id)];
    where.categoryId = { in: ids };
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      select: productListSelect,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    products: products.map((p) => serializeProduct(p)),
    total,
    page,
    limit,
    hasMore: skip + products.length < total,
  });
}
