import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type as InventoryType;
  let quantity = Number(body.quantity);
  if (type === "OUT" || type === "SALE") quantity = -Math.abs(quantity);
  if (type === "IN" || type === "RETURN") quantity = Math.abs(quantity);

  const variant = await prisma.productVariant.findUnique({
    where: { id: body.variantId },
  });
  if (!variant) {
    return NextResponse.json({ error: "Variante não encontrada" }, { status: 404 });
  }

  const newStock =
    type === "ADJUSTMENT" ? Math.abs(Number(body.quantity)) : variant.stock + quantity;

  if (newStock < 0) {
    return NextResponse.json({ error: "Estoque insuficiente" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: newStock },
    }),
    prisma.inventoryMovement.create({
      data: {
        variantId: variant.id,
        type,
        quantity: type === "ADJUSTMENT" ? newStock - variant.stock : quantity,
        note: body.note || null,
        createdBy: session.user.email || undefined,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, stock: newStock });
}
