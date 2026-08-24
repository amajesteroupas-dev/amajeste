import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CashEntryType, OrderStatus, PaymentStatus } from "@prisma/client";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import {
  finalizeOrderStockOnPaid,
  releaseOrderStockHold,
  reservationDeadline,
} from "@/lib/order-stock-reserve";

function checkWebhookBasicAuth(req: NextRequest): boolean {
  const expectedUser = process.env.PAGSEGURO_WEBHOOK_USER?.trim();
  const expectedPass = process.env.PAGSEGURO_WEBHOOK_PASS?.trim();
  // Sem credenciais no servidor, aceita (compatível). Com credenciais, exige Basic Auth.
  if (!expectedUser || !expectedPass) return true;

  const header = req.headers.get("authorization") || "";
  const match = /^Basic\s+(.+)$/i.exec(header);
  if (!match) return false;
  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const i = decoded.indexOf(":");
    if (i < 0) return false;
    const user = decoded.slice(0, i);
    const pass = decoded.slice(i + 1);
    return user === expectedUser && pass === expectedPass;
  } catch {
    return false;
  }
}

/**
 * Webhook PagBank / PagSeguro — Orders (cartão/Pix transparente).
 * Auth opcional: PAGSEGURO_WEBHOOK_USER + PAGSEGURO_WEBHOOK_PASS (Basic Auth).
 */
export async function POST(req: NextRequest) {
  if (!checkWebhookBasicAuth(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      id?: string;
      reference_id?: string;
      status?: string;
      charges?: { id?: string; status?: string }[];
      qr_codes?: unknown[];
    };

    console.info("[pagseguro webhook]", JSON.stringify(body).slice(0, 2000));

    const referenceId = String(body.reference_id || "").trim();
    const orderIdExt = String(body.id || "").trim();
    const chargeStatus = String(
      body.charges?.[0]?.status || body.status || ""
    ).toUpperCase();

    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          ...(orderIdExt ? [{ mercadoPagoId: orderIdExt }] : []),
          ...(referenceId ? [{ order: { orderNumber: referenceId } }] : []),
        ],
      },
      include: { order: true },
    });

    if (!payment) {
      return NextResponse.json({ ok: true, matched: false });
    }

    let paymentStatus: PaymentStatus = payment.status;
    let orderStatus: OrderStatus = payment.order.status;
    const wasApproved = payment.status === PaymentStatus.APPROVED;
    let paymentFailedKeepOrder = false;

    const anyChargePaid = (body.charges || []).some((c) =>
      ["PAID", "AUTHORIZED"].includes(String(c.status || "").toUpperCase())
    );

    if (
      chargeStatus === "PAID" ||
      chargeStatus === "AUTHORIZED" ||
      anyChargePaid
    ) {
      paymentStatus = PaymentStatus.APPROVED;
      orderStatus = OrderStatus.PAID;
    } else if (
      chargeStatus === "DECLINED" ||
      chargeStatus === "CANCELED" ||
      chargeStatus === "CANCELLED" ||
      chargeStatus === "DENIED"
    ) {
      paymentStatus = PaymentStatus.REJECTED;
      paymentFailedKeepOrder = true;
      // Mantém pedido PENDING — cliente tenta pagar de novo
      orderStatus = OrderStatus.PENDING;
    } else if (chargeStatus === "REFUNDED") {
      paymentStatus = PaymentStatus.REFUNDED;
      orderStatus = OrderStatus.REFUNDED;
    }

    if (
      paymentStatus === payment.status &&
      orderStatus === payment.order.status &&
      !paymentFailedKeepOrder
    ) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentStatus,
          mercadoPagoStatus: chargeStatus || payment.mercadoPagoStatus,
          paidAt: paymentStatus === PaymentStatus.APPROVED ? new Date() : null,
        },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: orderStatus,
          ...(paymentStatus === PaymentStatus.APPROVED
            ? { reservedUntil: null }
            : {}),
          ...(paymentFailedKeepOrder
            ? { reservedUntil: reservationDeadline() }
            : {}),
        },
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

      // Falha de pagamento: devolve baixa física legada e mantém prazo soft
      if (paymentFailedKeepOrder && payment.order.stockHeld) {
        await releaseOrderStockHold(
          payment.orderId,
          "Pagamento recusado — estoque liberado",
          tx
        );
        await tx.order.update({
          where: { id: payment.orderId },
          data: { reservedUntil: reservationDeadline(), stockHeld: false },
        });
      }

      if (orderStatus === OrderStatus.REFUNDED && payment.order.stockHeld) {
        await releaseOrderStockHold(
          payment.orderId,
          "Estoque devolvido (reembolso PagBank)",
          tx
        );
      }
    });

    if (paymentStatus === PaymentStatus.APPROVED && !wasApproved) {
      await finalizeOrderStockOnPaid(payment.orderId);
      void onOrderPaidSideEffects(payment.orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[pagseguro webhook]", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "pagseguro-webhook" });
}
