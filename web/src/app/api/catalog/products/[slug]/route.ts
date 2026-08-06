import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productListSelect, serializeProduct } from "@/lib/catalog-api";

type Ctx = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, active: true },
    select: {
      ...productListSelect,
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          title: true,
          body: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const related = await prisma.product.findMany({
    where: {
      deletedAt: null,
      active: true,
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    select: productListSelect,
    take: 8,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    product: {
      ...serializeProduct(product, { fullDescription: true }),
      reviews: product.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        comment: r.body,
        createdAt: r.createdAt,
        customerName: r.customer?.name || "Cliente",
      })),
    },
    related: related.map((p) => serializeProduct(p)),
  });
}
