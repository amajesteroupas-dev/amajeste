import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getPayment } from "@/lib/payments";
import { CashEntryType, OrderStatus, PaymentStatus } from "@prisma/client";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import {
  finalizeOrderStockOnPaid,
  releaseOrderStockHold,
  reservationDeadline,
} from "@/lib/order-stock-reserve";

function verifyMercadoPagoSignature(req: NextRequest, body: unknown): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  // Sem secret em produção: rejeita (evita webhook forjado)
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[MP webhook] MERCADOPAGO_WEBHOOK_SECRET obrigatório em produção"
      );
      return false;
    }
    return true;
  }

  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = req.headers.get("x-request-id") || "";
  if (!xSignature) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => {
      const [k, v] = p.split("=");
      return [k?.trim(), v?.trim()];
    })
  ) as Record<string, string>;

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const dataId =
    (body as { data?: { id?: string | number } })?.data?.id ??
    (body as { id?: string | number })?.id ??
    "";
  const dataIdStr = String(dataId);

  const manifest = `id:${dataIdStr};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(v1, "hex")
    );
  } catch {
    return expected === v1;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!verifyMercadoPagoSignature(req, body)) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

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
    /** Rejeição no gateway: pedido continua PENDING p/ cliente tentar de novo */
    let paymentFailedKeepOrder = false;

    if (status === "approved") {
      paymentStatus = PaymentStatus.APPROVED;
      orderStatus = OrderStatus.PAID;
    } else if (status === "rejected" || status === "cancelled") {
      paymentStatus = PaymentStatus.REJECTED;
      paymentFailedKeepOrder = true;
      // Não cancela o pedido — cliente pode pagar de novo na mesma compra
      orderStatus = OrderStatus.PENDING;
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

      // Só devolve estoque em reembolso (venda já paga desfeita)
      if (orderStatus === OrderStatus.REFUNDED && payment.order.stockHeld) {
        await releaseOrderStockHold(
          payment.orderId,
          "Estoque devolvido (reembolso)",
          tx
        );
      }
    });

    if (
      paymentStatus === PaymentStatus.APPROVED &&
      payment.status !== PaymentStatus.APPROVED
    ) {
      await finalizeOrderStockOnPaid(payment.orderId);
      void onOrderPaidSideEffects(payment.orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("MP webhook error", e);
    return NextResponse.json({ error: "webhook" }, { status: 500 });
  }
}
