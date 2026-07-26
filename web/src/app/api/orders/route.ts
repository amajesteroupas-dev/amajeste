import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/utils";
import { createCheckoutPreference, createPixPayment } from "@/lib/payments";
import { InventoryType, PaymentStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      guestName,
      guestEmail,
      guestPhone,
      shippingStreet,
      shippingNumber,
      shippingComplement,
      shippingNeighborhood,
      shippingCity,
      shippingState,
      shippingZip,
      shippingMethod,
      shippingCost = 0,
      paymentMethod = "pix",
      items,
    } = body;

    if (!guestEmail || !guestName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const variantIds = items.map((i: { variantId: string }) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, active: true },
      include: { product: true },
    });

    if (variants.length !== items.length) {
      return NextResponse.json({ error: "Variante inválida" }, { status: 400 });
    }

    let subtotal = 0;
    const orderItemsData = items.map((item: { variantId: string; quantity: number }) => {
      const variant = variants.find((v) => v.id === item.variantId)!;
      if (variant.stock < item.quantity) {
        throw new Error(`Estoque insuficiente: ${variant.product.name}`);
      }
      const unitPrice = Number(variant.price ?? variant.product.price);
      const total = unitPrice * item.quantity;
      subtotal += total;
      return {
        variantId: variant.id,
        productName: variant.product.name,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice,
        total,
      };
    });

    const total = subtotal + Number(shippingCost);

    let customer = await prisma.customer.findUnique({
      where: { email: guestEmail },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: guestName,
          email: guestEmail,
          phone: guestPhone || null,
        },
      });
    }

    const orderNumber = generateOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer!.id,
          guestName,
          guestEmail,
          guestPhone,
          status: "PENDING",
          subtotal,
          shippingCost: Number(shippingCost),
          total,
          shippingStreet,
          shippingNumber,
          shippingComplement,
          shippingNeighborhood,
          shippingCity,
          shippingState,
          shippingZip,
          shippingMethod,
          items: { create: orderItemsData },
        },
      });

      for (const item of orderItemsData) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: InventoryType.SALE,
            quantity: -item.quantity,
            note: `Pedido ${orderNumber}`,
          },
        });
      }

      return created;
    });

    let redirectUrl: string | undefined;
    let pixQrCode: string | undefined;
    let mercadoPagoId: string | undefined;

    if (paymentMethod === "checkout") {
      const pref = await createCheckoutPreference({
        orderId: order.id,
        email: guestEmail,
        items: orderItemsData.map((i: { productName: string; quantity: number; unitPrice: number }) => ({
          title: i.productName,
          quantity: i.quantity,
          unit_price: i.unitPrice,
        })),
      });
      mercadoPagoId = String(pref.id);
      redirectUrl =
        (pref as { init_point?: string; sandbox_init_point?: string }).init_point ||
        (pref as { sandbox_init_point?: string }).sandbox_init_point ||
        `/checkout/sucesso?order=${orderNumber}`;
    } else {
      const pix = await createPixPayment({
        amount: total,
        description: `Pedido ${orderNumber}`,
        email: guestEmail,
        orderId: order.id,
      });
      mercadoPagoId = String(pix.id);
      pixQrCode =
        (pix as { point_of_interaction?: { transaction_data?: { qr_code?: string } } })
          .point_of_interaction?.transaction_data?.qr_code;
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethod === "checkout" ? "mercadopago" : "pix",
        amount: total,
        status: PaymentStatus.PENDING,
        mercadoPagoId,
        pixQrCode,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      redirectUrl: redirectUrl || `/checkout/sucesso?order=${orderNumber}`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
