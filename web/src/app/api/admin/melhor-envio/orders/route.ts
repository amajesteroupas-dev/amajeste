import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { isLocalShippingId } from "@/lib/shipping";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

/** Pedidos para gerenciar etiquetas Melhor Envio */
export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "PENDING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      shipment: true,
      payment: { select: { status: true, method: true } },
    },
  });

  const items = orders.map((o) => {
    const local = isLocalShippingId(o.shippingServiceId);
    const sid = o.shippingServiceId || "";
    const isMb = sid.startsWith("mb-");
    const hasLabel = Boolean(o.shipment?.melhorEnvioId);
    let labelStatus: "local" | "ready" | "generated" | "pending_pay" | "no_service" =
      "pending_pay";
    if (local) labelStatus = "local";
    else if (hasLabel) labelStatus = "generated";
    else if (isMb) labelStatus = "ready";
    else if (!o.shippingServiceId || !/^\d+$/.test(o.shippingServiceId))
      labelStatus = "no_service";
    else if (o.payment?.status === "APPROVED" || o.status === "PAID" || o.status === "PROCESSING" || o.status === "SHIPPED")
      labelStatus = "ready";
    else labelStatus = "pending_pay";

    const provider = local
      ? "local"
      : isMb
        ? "manda_bem"
        : /^\d+$/.test(sid)
          ? "melhor_envio"
          : "unknown";

    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt,
      status: o.status,
      customerName: o.customer?.name || o.guestName,
      customerPhone: o.guestPhone || o.customer?.phone || null,
      city: o.shippingCity,
      state: o.shippingState,
      shippingMethod: o.shippingMethod,
      shippingServiceId: o.shippingServiceId,
      shippingCost: Number(o.shippingCost),
      paymentStatus: o.payment?.status,
      labelStatus,
      provider,
      melhorEnvioId: o.shipment?.melhorEnvioId || null,
      labelUrl: o.shipment?.labelUrl || null,
      trackingCode: o.shipment?.trackingCode || o.trackingCode || null,
    };
  });

  return NextResponse.json({ items });
}
