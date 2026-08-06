import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import { absoluteMediaUrl, money } from "@/lib/catalog-api";

/** Lista favoritos do cliente logado */
export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });

  return NextResponse.json({
    ids: favorites.map((f) => f.productId),
    items: favorites
      .filter((f) => f.product.active && !f.product.deletedAt)
      .map((f) => ({
        id: f.id,
        productId: f.productId,
        createdAt: f.createdAt,
        name: f.product.name,
        slug: f.product.slug,
        price: money(f.product.price),
        imageUrl: absoluteMediaUrl(f.product.images[0]?.url ?? null),
      })),
  });
}

/** Adiciona aos favoritos — body: { productId } */
export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Faça login para favoritar" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  if (!productId) {
    return NextResponse.json({ error: "Produto inválido" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  await prisma.favorite.upsert({
    where: {
      customerId_productId: { customerId: customer.id, productId },
    },
    create: { customerId: customer.id, productId },
    update: {},
  });

  return NextResponse.json({ ok: true, favorited: true });
}

/** Remove dos favoritos — body: { productId } ou ?productId= */
export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || sp.get("productId") || "").trim();
  if (!productId) {
    return NextResponse.json({ error: "Produto inválido" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: { customerId: customer.id, productId },
  });

  return NextResponse.json({ ok: true, favorited: false });
}
