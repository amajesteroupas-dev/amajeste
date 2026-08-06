import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import { money } from "@/lib/catalog-api";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: Ctx) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const order = await prisma.order.findFirst({
    where: {
      customerId: customer.id,
      OR: [{ id }, { orderNumber: id }],
    },
    include: {
      items: true,
      payment: true,
      shipment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.payment?.status || null,
      paymentMethod: order.payment?.method || null,
      subtotal: money(order.subtotal),
      shippingCost: money(order.shippingCost),
      discount: money(order.discount),
      total: money(order.total),
      couponCode: order.couponCode,
      shippingMethod: order.shippingMethod,
      shippingServiceId: order.shippingServiceId,
      trackingCode: order.trackingCode || order.shipment?.trackingCode || null,
      shippingStreet: order.shippingStreet,
      shippingNumber: order.shippingNumber,
      shippingComplement: order.shippingComplement,
      shippingNeighborhood: order.shippingNeighborhood,
      shippingCity: order.shippingCity,
      shippingState: order.shippingState,
      shippingZip: order.shippingZip,
      pixQrCode: order.payment?.pixQrCode || null,
      pixQrCodeBase64: order.payment?.pixQrCodeBase64 || null,
      boletoUrl: order.payment?.boletoUrl || null,
      boletoBarcode: order.payment?.boletoBarcode || null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((i) => ({
        id: i.id,
        productName: i.productName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: money(i.unitPrice),
        total: money(i.total),
      })),
    },
  });
}
