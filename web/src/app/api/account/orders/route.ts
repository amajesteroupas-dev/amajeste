import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import { money } from "@/lib/catalog-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      shippingCost: true,
      shippingMethod: true,
      trackingCode: true,
      createdAt: true,
      payment: {
        select: { status: true, method: true },
      },
      items: {
        select: {
          productName: true,
          quantity: true,
          size: true,
          color: true,
        },
        take: 3,
      },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.payment?.status || null,
      paymentMethod: o.payment?.method || null,
      total: money(o.total),
      shippingCost: money(o.shippingCost),
      shippingMethod: o.shippingMethod,
      trackingCode: o.trackingCode,
      createdAt: o.createdAt,
      itemsPreview: o.items,
    })),
  });
}
