import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/payments";
import { CashEntryType, OrderStatus, PaymentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const paymentId = String(body.data?.id || body.id || "");
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const mpPayment = await getPayment(paymentId);
    if (!mpPayment) {
      return NextResponse.json({ ok: true, mock: true });
    }

    const externalRef = String(
      (mpPayment as { external_reference?: string }).external_reference || ""
    );
    const status = String((mpPayment as { status?: string }).status || "");

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ mercadoPagoId: paymentId }, { orderId: externalRef }],
      },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ ok: true });
    }

    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let orderStatus: OrderStatus = payment.order.status;

    if (status === "approved") {
      paymentStatus = PaymentStatus.APPROVED;
      orderStatus = OrderStatus.PAID;
    } else if (status === "rejected" || status === "cancelled") {
      paymentStatus = PaymentStatus.REJECTED;
      orderStatus = OrderStatus.CANCELLED;
    } else if (status === "refunded") {
      paymentStatus = PaymentStatus.REFUNDED;
      orderStatus = OrderStatus.REFUNDED;
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentStatus,
          mercadoPagoStatus: status,
          paidAt: paymentStatus === PaymentStatus.APPROVED ? new Date() : null,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: orderStatus },
      });

      if (paymentStatus === PaymentStatus.APPROVED) {
        const existing = await tx.cashEntry.findFirst({
          where: { orderId: payment.orderId, type: CashEntryType.INCOME },
        });
        if (!existing) {
          await tx.cashEntry.create({
            data: {
              type: CashEntryType.INCOME,
              amount: payment.amount,
              description: `Pedido ${payment.order.orderNumber}`,
              category: "Vendas",
              orderId: payment.orderId,
            },
          });
        }
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "webhook error" }, { status: 500 });
  }
}
