import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CashEntryType, OrderStatus } from "@prisma/client";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body.status as OrderStatus;

  const order = await prisma.order.update({
    where: { id },
    data: {
      status,
      trackingCode: body.trackingCode || null,
    },
  });

  if (status === "SHIPPED") {
    await prisma.shipment.upsert({
      where: { orderId: id },
      update: {
        trackingCode: body.trackingCode || null,
        shippedAt: new Date(),
      },
      create: {
        orderId: id,
        trackingCode: body.trackingCode || null,
        shippedAt: new Date(),
      },
    });
  }

  if (status === "PAID" || status === "DELIVERED") {
    const existing = await prisma.cashEntry.findFirst({
      where: { orderId: id, type: CashEntryType.INCOME },
    });
    if (!existing) {
      await prisma.cashEntry.create({
        data: {
          type: CashEntryType.INCOME,
          amount: order.total,
          description: `Pedido ${order.orderNumber}`,
          category: "Vendas",
          orderId: id,
        },
      });
    }
    await prisma.payment.updateMany({
      where: { orderId: id },
      data: { status: "APPROVED", paidAt: new Date() },
    });
  }

  return NextResponse.json(order);
}
