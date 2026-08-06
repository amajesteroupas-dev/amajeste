import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { absoluteMediaUrl } from "@/lib/catalog-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const flat = req.nextUrl.searchParams.get("flat") === "1";

  if (flat) {
    const categories = await prisma.category.findMany({
      where: { slug: { not: "pagina-principal" } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        parentId: true,
        sortOrder: true,
      },
    });
    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        imageUrl: absoluteMediaUrl(c.imageUrl),
      })),
    });
  }

  const roots = await prisma.category.findMany({
    where: { parentId: null, slug: { not: "pagina-principal" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: { select: { products: true } },
    },
  });

  return NextResponse.json({
    categories: roots.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      imageUrl: absoluteMediaUrl(c.imageUrl),
      productCount: c._count.products,
      children: c.children.map((ch) => ({
        id: ch.id,
        name: ch.name,
        slug: ch.slug,
        imageUrl: absoluteMediaUrl(ch.imageUrl),
      })),
    })),
  });
}
