import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { trackCorreios } from "@/lib/correios-tracking";
import { isLocalShippingId } from "@/lib/shipping";

/** GET /api/tracking?codigo=XX | ?pedido=N */
export async function GET(req: NextRequest) {
  const codigo = req.nextUrl.searchParams.get("codigo")?.trim() || "";
  const pedido = req.nextUrl.searchParams.get("pedido")?.trim() || "";

  let trackingCode = codigo;
  let orderNumber: string | null = null;
  let orderStatus: string | null = null;
  let shippingMethod: string | null = null;
  let local = false;

  if (pedido) {
    const order = await prisma.order.findUnique({
      where: { orderNumber: pedido },
      include: { shipment: true },
    });
    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 }
      );
    }
    orderNumber = order.orderNumber;
    orderStatus = order.status;
    shippingMethod = order.shippingMethod;
    local = isLocalShippingId(order.shippingServiceId);
    trackingCode =
      trackingCode ||
      order.trackingCode ||
      order.shipment?.trackingCode ||
      "";
  }

  if (local && !trackingCode) {
    return NextResponse.json({
      orderNumber,
      orderStatus,
      shippingMethod,
      local: true,
      tracking: null,
      message:
        "Entrega local — combine a retirada/entrega pelo WhatsApp. Não há rastreio dos Correios.",
    });
  }

  if (!trackingCode) {
    return NextResponse.json(
      {
        error: "Informe o código de rastreio ou o número do pedido",
        orderNumber,
        orderStatus,
        shippingMethod,
        local,
      },
      { status: 400 }
    );
  }

  const tracking = await trackCorreios(trackingCode);
  return NextResponse.json({
    orderNumber,
    orderStatus,
    shippingMethod,
    local,
    tracking,
  });
}
