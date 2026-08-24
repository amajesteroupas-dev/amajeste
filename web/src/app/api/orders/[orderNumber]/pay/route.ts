import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import { createPagSeguroCardOrder, createPagSeguroPixOrder } from "@/lib/payments-pagseguro";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import { checkoutSuccessPath, verifyOrderAccess } from "@/lib/order-access";
import {
  STOCK_RESERVE_SECONDS,
  STOCK_RESERVE_MINUTES,
  availableStock,
  finalizeOrderStockOnPaid,
  releaseOrderStockHold,
  renewPaymentDeadline,
  reservationDeadline,
} from "@/lib/order-stock-reserve";

type Props = { params: Promise<{ orderNumber: string }> };

/**
 * Retoma pagamento de pedido PENDING (cartão ou Pix PagBank).
 */
export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { orderNumber: raw } = await params;
    const orderNumber = String(raw || "").trim();
    if (!orderNumber) {
      return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
    }

    const body = await req.json();
    const {
      encryptedCard,
      installments,
      holderName,
      holderTaxId,
      interestTotal,
      interestTotalCents,
      interestInstallments,
      cardBin,
      maxInterestFree,
      payType,
      accessToken,
    } = body as {
      encryptedCard?: string;
      installments?: number;
      holderName?: string;
      holderTaxId?: string;
      interestTotal?: number;
      interestTotalCents?: number;
      interestInstallments?: number;
      cardBin?: string;
      maxInterestFree?: number;
      payType?: "CREDIT_CARD" | "PIX";
      accessToken?: string;
    };

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        payment: true,
        customer: { include: { user: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    if (order.status !== OrderStatus.PENDING) {
      return NextResponse.json(
        { error: "Este pedido não está pendente de pagamento." },
        { status: 400 }
      );
    }

    if (order.payment?.status === PaymentStatus.APPROVED) {
      return NextResponse.json(
        { error: "Este pedido já foi pago." },
        { status: 400 }
      );
    }

    const session = await auth();
    const isOwner =
      session?.user?.role === "CUSTOMER" &&
      order.customer?.userId === session.user.id;
    const tokenOk = verifyOrderAccess(orderNumber, accessToken);
    if (!isOwner && !tokenOk) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Prazo vencido: reabre se ainda houver estoque; senão cancela
    if (order.reservedUntil && order.reservedUntil.getTime() < Date.now()) {
      let canRevive = true;
      for (const item of order.items) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant) {
          canRevive = false;
          break;
        }
        const free = await availableStock(variant.id, variant.stock, order.id);
        if (free < item.quantity) {
          canRevive = false;
          break;
        }
      }
      if (!canRevive) {
        if (order.stockHeld) {
          await releaseOrderStockHold(order.id, "Prazo de pagamento expirado");
        }
        await prisma.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CANCELLED, reservedUntil: null },
        });
        await prisma.payment.updateMany({
          where: { orderId: order.id },
          data: { status: PaymentStatus.REJECTED },
        });
        return NextResponse.json(
          {
            error:
              "O prazo para pagar este pedido expirou e o estoque não está mais disponível. Faça um novo pedido.",
          },
          { status: 410 }
        );
      }
      await renewPaymentDeadline(order.id);
    }

    // Se ainda segura baixa física (legado) e o pagamento falhou, libera
    // para o cliente poder comprar de novo se cancelar — mas neste fluxo
    // convertemos para reserva soft mantendo o pedido pagável.
    if (order.stockHeld) {
      await releaseOrderStockHold(
        order.id,
        "Converte reserva física em prazo de pagamento"
      );
    }

    // Confere disponibilidade (excluindo este próprio pedido da conta soft)
    for (const item of order.items) {
      const variant = await prisma.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { name: true } } },
      });
      if (!variant) {
        return NextResponse.json(
          { error: "Produto indisponível" },
          { status: 400 }
        );
      }
      const free = await availableStock(
        variant.id,
        variant.stock,
        order.id
      );
      if (free < item.quantity) {
        return NextResponse.json(
          {
            error: `Sem estoque para ${variant.product.name}. O prazo deste pedido pode ter sido usado por outra compra.`,
          },
          { status: 409 }
        );
      }
    }

    await renewPaymentDeadline(order.id);

    const email = String(order.guestEmail || order.customer?.email || "");
    const name = String(
      holderName || order.guestName || order.customer?.name || "Cliente"
    );
    const phone = order.guestPhone || order.customer?.phone || null;
    const amount = Number(order.total);
    const type = String(payType || "CREDIT_CARD").toUpperCase();

    const linePs = order.items.map((i) => ({
      title: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    }));

    const shippingAddr = {
      street: order.shippingStreet || undefined,
      number: order.shippingNumber || undefined,
      complement: order.shippingComplement || undefined,
      neighborhood: order.shippingNeighborhood || undefined,
      city: order.shippingCity || undefined,
      state: order.shippingState || undefined,
      zip: order.shippingZip || undefined,
    };

    let externalId: string | undefined;
    let paymentMethodLabel = "pagseguro_card";
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;
    let pixQrCode: string | undefined;
    let pixQrCodeBase64: string | undefined;
    let redirectUrl = checkoutSuccessPath(orderNumber);

    if (type === "PIX") {
      const ps = await createPagSeguroPixOrder({
        orderId: order.id,
        orderNumber,
        email,
        name: String(order.guestName || order.customer?.name || name),
        cpf: order.customer?.cpf || null,
        phone,
        amount,
        items: linePs,
        shipping: shippingAddr,
      });
      externalId = String(ps.id);
      pixQrCode = ps.pixQrCode;
      pixQrCodeBase64 = ps.pixQrCodeBase64;
      paymentMethodLabel = "pagseguro_pix";
      redirectUrl = ps.redirectUrl || redirectUrl;
    } else {
      if (!encryptedCard) {
        return NextResponse.json(
          { error: "Dados do cartão incompletos" },
          { status: 400 }
        );
      }
      const taxForCard =
        (holderTaxId ? digitsOnly(String(holderTaxId)) : null) ||
        (order.customer?.cpf ? digitsOnly(order.customer.cpf) : null);
      if (!taxForCard || !isValidCpf(taxForCard)) {
        return NextResponse.json(
          { error: "CPF válido é obrigatório para cartão" },
          { status: 400 }
        );
      }

      try {
        const ps = await createPagSeguroCardOrder({
          orderId: order.id,
          orderNumber,
          email,
          name,
          cpf: taxForCard,
          phone,
          amount,
          encryptedCard: String(encryptedCard),
          installments: Number(installments) || 1,
          interestTotal: Number(interestTotal) || 0,
          interestTotalCents:
            interestTotalCents != null
              ? Number(interestTotalCents)
              : undefined,
          interestInstallments: Number(interestInstallments) || undefined,
          cardBin: cardBin ? String(cardBin) : undefined,
          maxInterestFree: Number(maxInterestFree) || 1,
          items: linePs,
          shipping: shippingAddr,
          shippingCost: Number(order.shippingCost) || 0,
        });
        externalId = String(ps.id);
        paymentMethodLabel = "pagseguro_card";
        if (ps.paid) {
          paymentStatus = PaymentStatus.APPROVED;
          await prisma.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.PAID, reservedUntil: null },
          });
        }
      } catch (cardErr) {
        const declined =
          cardErr instanceof Error &&
          (cardErr as { code?: string }).code === "CARD_DECLINED";
        await prisma.payment.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            method: "pagseguro_card",
            amount,
            status: PaymentStatus.REJECTED,
            mercadoPagoStatus: "declined",
          },
          update: {
            method: "pagseguro_card",
            status: PaymentStatus.REJECTED,
            mercadoPagoStatus: "declined",
          },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: {
            reservedUntil: reservationDeadline(),
            stockHeld: false,
          },
        });
        return NextResponse.json(
          {
            error:
              cardErr instanceof Error
                ? cardErr.message
                : "Pagamento recusado. Verifique o cartão ou tente Pix.",
            orderNumber,
          },
          { status: declined ? 402 : 400 }
        );
      }
    }

    await prisma.payment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        method: paymentMethodLabel,
        amount,
        status: paymentStatus,
        mercadoPagoId: externalId,
        mercadoPagoStatus:
          paymentStatus === PaymentStatus.APPROVED ? "approved" : undefined,
        pixQrCode,
        pixQrCodeBase64,
        paidAt:
          paymentStatus === PaymentStatus.APPROVED ? new Date() : undefined,
      },
      update: {
        method: paymentMethodLabel,
        amount,
        status: paymentStatus,
        mercadoPagoId: externalId,
        mercadoPagoStatus:
          paymentStatus === PaymentStatus.APPROVED ? "approved" : undefined,
        pixQrCode,
        pixQrCodeBase64,
        paidAt:
          paymentStatus === PaymentStatus.APPROVED ? new Date() : undefined,
      },
    });

    if (paymentStatus === PaymentStatus.APPROVED) {
      await finalizeOrderStockOnPaid(order.id);
      void onOrderPaidSideEffects(order.id);
    }

    return NextResponse.json({
      ok: true,
      orderNumber,
      paymentStatus,
      redirectUrl,
      pixQrCode,
      pixQrCodeBase64,
      pixCopyPaste: pixQrCode,
      reservedUntil:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : (
              await prisma.order.findUnique({
                where: { id: order.id },
                select: { reservedUntil: true },
              })
            )?.reservedUntil?.toISOString() ?? null,
      reserveSeconds:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : STOCK_RESERVE_SECONDS,
      reserveMinutes:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : STOCK_RESERVE_MINUTES,
    });
  } catch (err) {
    console.error("[orders pay]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao pagar pedido" },
      { status: 500 }
    );
  }
}
