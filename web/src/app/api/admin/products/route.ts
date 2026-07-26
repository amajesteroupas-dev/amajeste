import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return null;
  }
  return session;
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    name,
    description,
    price,
    costPrice = 0,
    categoryId,
    featured = false,
    size,
    color,
    stock = 0,
    sku,
  } = body;

  if (!name || !description || !price || !categoryId || !sku || !size || !color) {
    return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
  }

  let slug = slugify(name);
  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      description,
      price,
      costPrice,
      categoryId,
      featured,
      images: {
        create: [
          {
            url: `/placeholders/${slug}.svg`,
            alt: name,
            isPrimary: true,
          },
        ],
      },
      variants: {
        create: [
          {
            sku,
            size,
            color,
            stock: Number(stock),
          },
        ],
      },
    },
  });

  if (Number(stock) > 0) {
    const variant = await prisma.productVariant.findFirst({
      where: { productId: product.id },
    });
    if (variant) {
      await prisma.inventoryMovement.create({
        data: {
          variantId: variant.id,
          type: "IN",
          quantity: Number(stock),
          note: "Estoque inicial",
        },
      });
    }
  }

  return NextResponse.json(product);
}
