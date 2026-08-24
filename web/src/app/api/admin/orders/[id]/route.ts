import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { CashEntryType, OrderStatus } from "@prisma/client";
import { notifyOrderShipped } from "@/lib/order-notify";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import {
  finalizeOrderStockOnPaid,
  cancelOrderAndReleaseStock,
} from "@/lib/order-stock-reserve";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Props) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const status = body.status as OrderStatus;
  const notifyCustomer = body.notifyCustomer !== false;

  const previous = await prisma.order.findUnique({ where: { id } });
  if (!previous) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  // Cancelamento dedicado: libera reserva soft + devolve estoque físico
  if (status === "CANCELLED") {
    const cancel = await cancelOrderAndReleaseStock(
      id,
      "Pedido cancelado no admin"
    );
    const order = await prisma.order.update({
      where: { id },
      data: { trackingCode: body.trackingCode || null },
    });

    void writeAuditLog({
      category: "orders",
      action: "cancel",
      summary: `Pedido ${order.orderNumber}: ${previous.status} → CANCELLED (estoque liberado)`,
      entityType: "Order",
      entityId: order.id,
      detail: {
        from: previous.status,
        to: "CANCELLED",
        stockReturned: cancel.units,
        cashReversed: cancel.cashReversed,
        alreadyCancelled: cancel.alreadyCancelled,
      },
      actor: actorFromSession(session),
      ip: requestIp(req),
    });

    return NextResponse.json({
      ...order,
      notify: null,
      stockReturned: cancel.units,
      cashReversed: cancel.cashReversed,
    });
  }

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
    if (previous.status !== "PAID" && status === "PAID") {
      await finalizeOrderStockOnPaid(id);
      void onOrderPaidSideEffects(id);
    }
  }

  let notify = null;
  const becameShipped =
    status === "SHIPPED" && previous.status !== "SHIPPED";
  const trackingChanged =
    status === "SHIPPED" &&
    Boolean(body.trackingCode) &&
    body.trackingCode !== previous.trackingCode;

  if (notifyCustomer && (becameShipped || trackingChanged)) {
    notify = await notifyOrderShipped(id);
  }

  void writeAuditLog({
    category: "orders",
    action: "update",
    summary: `Pedido ${order.orderNumber}: ${previous.status} → ${status}`,
    entityType: "Order",
    entityId: order.id,
    detail: {
      from: previous.status,
      to: status,
      trackingCode: body.trackingCode || null,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({ ...order, notify });
}
