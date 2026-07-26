import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const variant = await prisma.productVariant.create({
    data: {
      productId: id,
      sku: body.sku,
      size: body.size,
      color: body.color,
      stock: Number(body.stock || 0),
    },
  });

  if (Number(body.stock) > 0) {
    await prisma.inventoryMovement.create({
      data: {
        variantId: variant.id,
        type: "IN",
        quantity: Number(body.stock),
        note: "Estoque inicial variante",
      },
    });
  }

  return NextResponse.json(variant);
}
