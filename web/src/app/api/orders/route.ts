import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import {
  createBoletoPayment,
  createCardPayment,
  createCheckoutPreference,
  createPixPayment,
} from "@/lib/payments";
import {
  createPagSeguroCardOrder,
  createPagSeguroPixOrder,
  humanizePagBankError,
} from "@/lib/payments-pagseguro";
import { createInfinityPayCheckout } from "@/lib/payments-infinitypay";
import { getEnabledCheckoutMethods } from "@/lib/payment-settings";
import {
  getFinanceOpsSettings,
  packagingUnitCost,
  taxOnSalePrice,
} from "@/lib/finance-settings";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import {
  STOCK_RESERVE_SECONDS,
  STOCK_RESERVE_MINUTES,
  availableStock,
  expireStaleStockReservations,
  finalizeOrderStockOnPaid,
  reservationDeadline,
} from "@/lib/order-stock-reserve";
import { PaymentStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import {
  computeCheckoutDiscounts,
  resolveCheckoutPromotion,
} from "@/lib/promotion-settings";
import { applyPriceAdjust } from "@/lib/promotion-pricing";
import { lookRewardPercent } from "@/lib/look-reward";
import { defaultPayment } from "@/lib/site";
import { checkoutSuccessPath } from "@/lib/order-access";
import { isLocalShippingId } from "@/lib/shipping";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { parseAttributionPayload } from "@/lib/traffic-attribution";
import { attributionToOrderFields } from "@/lib/traffic-attribution-server";
import { markCartRecovered } from "@/lib/abandoned-cart";

export async function POST(req: NextRequest) {
  try {
    // Libera estoque de reservas vencidas antes de checar disponibilidade
    await expireStaleStockReservations(30);

    const session = await auth();
    const mobileUser = await getMobileAuthUser();
    const body = await req.json();
    const {
      guestName,
      guestEmail,
      guestPhone,
      cpf: cpfRaw,
      shippingStreet,
      shippingNumber,
      shippingComplement,
      shippingNeighborhood,
      shippingCity,
      shippingState,
      shippingZip,
      shippingMethod,
      shippingServiceId,
      shippingCost = 0,
      paymentMethod = "pix",
      couponCode: couponRaw,
      items,
      cardToken,
      paymentMethodId: cardPaymentMethodId,
      installments,
      issuerId,
      pagseguroType,
      encryptedCard,
      holderName,
      holderTaxId,
      interestTotal,
      interestTotalCents,
      interestInstallments,
      cardBin,
      maxInterestFree,
      attribution: attributionRaw,
      cartSessionId,
    } = body;

    if (!guestEmail || !guestName || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const enabled = await getEnabledCheckoutMethods();
    const selected = enabled.find((m) => m.id === paymentMethod);
    if (!selected) {
      return NextResponse.json(
        { error: "Forma de pagamento indisponível. Escolha outra no checkout." },
        { status: 400 }
      );
    }

    const cpf = cpfRaw ? digitsOnly(String(cpfRaw)) : null;
    if (cpf && !isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }

    const variantIds = items.map((i: { variantId: string }) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, active: true },
      include: {
        product: {
          include: {
            category: { select: { priceAdjustPercent: true } },
          },
        },
      },
    });

    if (variants.length !== items.length) {
      return NextResponse.json({ error: "Variante inválida" }, { status: 400 });
    }

    let subtotal = 0;
    const finCosts = (await getFinanceOpsSettings()).costs;
    const packUnit = packagingUnitCost(finCosts);
    const orderItemsData: {
      variantId: string;
      productName: string;
      size: string;
      color: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      unitPackaging: number;
      unitTax: number;
      total: number;
    }[] = [];
    for (const item of items as { variantId: string; quantity: number }[]) {
      const variant = variants.find((v) => v.id === item.variantId)!;
      const free = await availableStock(variant.id, variant.stock);
      if (free < item.quantity) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente: ${variant.product.name}`,
          },
          { status: 400 }
        );
      }
      const basePrice = Number(variant.price ?? variant.product.price);
      const unitPrice = applyPriceAdjust(
        basePrice,
        variant.product.category?.priceAdjustPercent
      );
      const unitCost =
        Number(variant.avgCost) > 0
          ? Number(variant.avgCost)
          : Number(variant.product.costPrice) || 0;
      const unitTax = taxOnSalePrice(unitPrice, finCosts.taxPercent);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      orderItemsData.push({
        variantId: variant.id,
        productName: variant.product.name,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice,
        unitCost,
        unitPackaging: packUnit,
        unitTax,
        total: lineTotal,
      });
    }

    let safeShipping = Number(shippingCost) || 0;
    if (!Number.isFinite(safeShipping) || safeShipping < 0 || safeShipping > 800) {
      return NextResponse.json({ error: "Frete inválido" }, { status: 400 });
    }
    if (isLocalShippingId(shippingServiceId)) {
      safeShipping = 0;
    }

    const totalBeforeDiscount = subtotal + safeShipping;
    const isPagBankPix =
      paymentMethod === "pagseguro_pix" ||
      (paymentMethod === "pagseguro" &&
        String(pagseguroType || "").toUpperCase() === "PIX");
    const isPagBankCard =
      paymentMethod === "pagseguro_card" ||
      (paymentMethod === "pagseguro" &&
        String(pagseguroType || "").toUpperCase() === "CREDIT_CARD");
    const isPixMethod = paymentMethod === "pix" || isPagBankPix;
    const isCardMethod = paymentMethod === "credit_card" || isPagBankCard;
    const cardInstallments = Math.max(1, Number(installments) || 1);
    const matchedPromo = await resolveCheckoutPromotion({
      isPix: isPixMethod,
      isCard: isCardMethod,
      installments: cardInstallments,
    });
    const email = String(guestEmail).toLowerCase();
    const sessionUserId =
      mobileUser?.role === "CUSTOMER"
        ? mobileUser.sub
        : session?.user?.role === "CUSTOMER"
          ? session.user.id
          : null;
    const sessionEmail =
      mobileUser?.email?.toLowerCase() ||
      session?.user?.email?.toLowerCase() ||
      "";

    // 1) Conta logada (userId é único)  2) e-mail do formulário
    let customer = sessionUserId
      ? await prisma.customer.findUnique({ where: { userId: sessionUserId } })
      : null;
    if (!customer) {
      customer = await prisma.customer.findUnique({ where: { email } });
    }

    if (!customer) {
      try {
        customer = await prisma.customer.create({
          data: {
            name: guestName,
            email,
            phone: guestPhone || null,
            cpf,
            userId: sessionUserId || undefined,
          },
        });
      } catch (createErr) {
        // Corrida / userId já ligado: reutiliza o cadastro existente
        const byUser = sessionUserId
          ? await prisma.customer.findUnique({
              where: { userId: sessionUserId },
            })
          : null;
        const byEmail = await prisma.customer.findUnique({ where: { email } });
        customer = byUser || byEmail;
        if (!customer) throw createErr;
      }
    } else if (
      sessionUserId &&
      (customer.userId === sessionUserId ||
        (!customer.userId && sessionEmail === email))
    ) {
      // Só atualiza PII se a sessão logada for dona do cadastro
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: guestName || customer.name,
          phone: guestPhone || customer.phone,
          cpf: cpf || customer.cpf,
          userId: customer.userId || sessionUserId,
        },
      });
    }
    // Pedido guest com e-mail já existente: não sobrescreve dados do cliente

    if (shippingZip && shippingStreet) {
      const hasAddress = await prisma.address.count({
        where: { customerId: customer.id },
      });
      if (hasAddress === 0) {
        await prisma.address.create({
          data: {
            customerId: customer.id,
            street: String(shippingStreet),
            number: String(shippingNumber || "S/N"),
            complement: shippingComplement
              ? String(shippingComplement)
              : null,
            neighborhood: String(shippingNeighborhood || ""),
            city: String(shippingCity || ""),
            state: String(shippingState || "").toUpperCase().slice(0, 2),
            zipCode: String(shippingZip).replace(/\D/g, ""),
            isDefault: true,
          },
        });
      }
    }

    let discount = 0;
    let appliedCouponCode: string | null = null;
    let couponId: string | null = null;
    let lookPostIdForCoupon: string | null = null;
    let couponPercentApplied = 0;
    const couponCode = couponRaw
      ? String(couponRaw).trim().toUpperCase().replace(/\s+/g, "")
      : "";

    if (couponCode) {
      const coupon = await prisma.discountCoupon.findUnique({
        where: { code: couponCode },
        include: { lookPost: true },
      });
      if (coupon) {
        if (coupon.used) {
          return NextResponse.json(
            { error: "Este cupom já foi usado" },
            { status: 400 }
          );
        }
        if (coupon.expiresAt && coupon.expiresAt < new Date()) {
          return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
        }
        if (coupon.customerId && coupon.customerId !== customer.id) {
          return NextResponse.json(
            { error: "Este cupom é exclusivo de outra cliente" },
            { status: 403 }
          );
        }
        couponPercentApplied = lookRewardPercent(coupon.percent);
        discount =
          Math.round(subtotal * (couponPercentApplied / 100) * 100) / 100;
        appliedCouponCode = coupon.code;
        couponId = coupon.id;
        lookPostIdForCoupon = coupon.lookPostId;
      } else {
        const look = await prisma.lookPost.findUnique({
          where: { rewardCode: couponCode },
        });
        if (
          !look ||
          look.status !== "APPROVED" ||
          look.rewardUsed ||
          look.customerId !== customer.id
        ) {
          return NextResponse.json({ error: "Cupom inválido" }, { status: 400 });
        }
        couponPercentApplied = lookRewardPercent(look.rewardPercent);
        discount =
          Math.round(subtotal * (couponPercentApplied / 100) * 100) / 100;
        appliedCouponCode = look.rewardCode;
        lookPostIdForCoupon = look.id;
      }
    }

    const breakdown = computeCheckoutDiscounts({
      subtotal,
      couponPercent: couponPercentApplied,
      isPix: isPixMethod,
      isCard: isCardMethod,
      installments: cardInstallments,
      matchedPromo,
      basePixPercent: defaultPayment.pixDiscountPercent,
    });
    // Cupom já calculado em `discount`; site/pix vêm do breakdown (0 se houver cupom)
    const siteDiscount = breakdown.siteDiscount;
    const pixExtraDiscount = breakdown.pixDiscount;
    const totalDiscountAmount =
      Math.round((discount + siteDiscount + pixExtraDiscount) * 100) / 100;
    const total = Math.max(0, totalBeforeDiscount - totalDiscountAmount);
    const orderNumber = await generateOrderNumber();
    const attrFields = attributionToOrderFields(
      parseAttributionPayload(attributionRaw)
    );

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer!.id,
          guestName,
          guestEmail: email,
          guestPhone,
          status: "PENDING",
          subtotal,
          shippingCost: safeShipping,
          discount: totalDiscountAmount,
          total,
          couponCode: appliedCouponCode,
          shippingStreet,
          shippingNumber,
          shippingComplement,
          shippingNeighborhood,
          shippingCity,
          shippingState,
          shippingZip,
          shippingMethod,
          shippingServiceId: shippingServiceId
            ? String(shippingServiceId).slice(0, 64)
            : null,
          reservedUntil: reservationDeadline(),
          // Estoque físico só baixa quando o pagamento for confirmado
          stockHeld: false,
          ...attrFields,
          items: { create: orderItemsData },
        },
      });

      if (couponId) {
        await tx.discountCoupon.update({
          where: { id: couponId },
          data: {
            used: true,
            usedAt: new Date(),
            orderId: created.id,
          },
        });
      }
      if (lookPostIdForCoupon) {
        await tx.lookPost.update({
          where: { id: lookPostIdForCoupon },
          data: { rewardUsed: true },
        });
      }

      return created;
    });

    let redirectUrl: string | undefined;
    let pixQrCode: string | undefined;
    let pixQrCodeBase64: string | undefined;
    let boletoUrl: string | undefined;
    let boletoBarcode: string | undefined;
    let externalId: string | undefined;
    let paymentMethodLabel = selected.id;
    let preferenceId: string | undefined;
    let paymentStatus: PaymentStatus = PaymentStatus.PENDING;

    const lineItems = orderItemsData.map(
      (i: { productName: string; quantity: number; unitPrice: number }) => ({
        title: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        unitPrice: i.unitPrice,
      })
    );

    if (paymentMethod === "pix") {
      const pix = await createPixPayment({
        amount: total,
        description: `Pedido ${orderNumber}`,
        email,
        orderId: order.id,
      });
      externalId = String(pix.id);
      const td = (
        pix as {
          point_of_interaction?: {
            transaction_data?: { qr_code?: string; qr_code_base64?: string };
          };
        }
      ).point_of_interaction?.transaction_data;
      pixQrCode = td?.qr_code;
      pixQrCodeBase64 = td?.qr_code_base64;
      paymentMethodLabel = "pix";
      redirectUrl = checkoutSuccessPath(orderNumber);
    } else if (paymentMethod === "boleto") {
      if (!cpf || !isValidCpf(cpf)) {
        return NextResponse.json(
          { error: "CPF válido é obrigatório para boleto" },
          { status: 400 }
        );
      }
      const boleto = await createBoletoPayment({
        amount: total,
        description: `Pedido ${orderNumber}`,
        email,
        orderId: order.id,
        name: String(guestName),
        cpf,
        zip: String(shippingZip || ""),
        street: String(shippingStreet || ""),
        number: String(shippingNumber || "S/N"),
        neighborhood: String(shippingNeighborhood || ""),
        city: String(shippingCity || ""),
        state: String(shippingState || ""),
      });
      externalId = String(boleto.id);
      boletoUrl = (
        boleto as {
          transaction_details?: { external_resource_url?: string };
        }
      ).transaction_details?.external_resource_url;
      boletoBarcode = (
        boleto as { barcode?: { content?: string } }
      ).barcode?.content;
      paymentMethodLabel = "boleto";
      redirectUrl = checkoutSuccessPath(orderNumber);
    } else if (paymentMethod === "credit_card") {
      if (!cardToken || !cardPaymentMethodId) {
        return NextResponse.json(
          { error: "Dados do cartão incompletos" },
          { status: 400 }
        );
      }
      if (!cpf || !isValidCpf(cpf)) {
        return NextResponse.json(
          { error: "CPF válido é obrigatório para cartão" },
          { status: 400 }
        );
      }
      const card = await createCardPayment({
        amount: total,
        description: `Pedido ${orderNumber}`,
        email,
        orderId: order.id,
        token: String(cardToken),
        paymentMethodId: String(cardPaymentMethodId),
        installments: Number(installments) || 1,
        issuerId: issuerId,
        cpf,
      });
      externalId = String(card.id);
      const status = String((card as { status?: string }).status || "");
      paymentMethodLabel = "credit_card";
      if (status === "approved") {
        paymentStatus = PaymentStatus.APPROVED;
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "PAID" },
        });
      } else if (status === "rejected" || status === "cancelled") {
        paymentStatus = PaymentStatus.REJECTED;
      }
      redirectUrl = checkoutSuccessPath(orderNumber);
      if (paymentStatus === PaymentStatus.REJECTED) {
        await prisma.payment.create({
          data: {
            orderId: order.id,
            method: paymentMethodLabel,
            amount: total,
            status: paymentStatus,
            mercadoPagoId: externalId,
            mercadoPagoStatus: status,
          },
        });
        return NextResponse.json(
          {
            error:
              "Pagamento recusado. Verifique os dados do cartão ou escolha outro meio.",
            orderNumber,
          },
          { status: 402 }
        );
      }
    } else if (paymentMethod === "mercadopago_wallet") {
      const pref = await createCheckoutPreference({
        orderId: order.id,
        orderNumber,
        email,
        shippingCost: safeShipping,
        items: lineItems.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      externalId = String(pref.id);
      preferenceId = String(pref.id);
      paymentMethodLabel = "mercadopago_wallet";
      redirectUrl = undefined;
    } else if (
      paymentMethod === "pagseguro" ||
      paymentMethod === "pagseguro_pix" ||
      paymentMethod === "pagseguro_card"
    ) {
      // Checkout transparente (API Orders) — cartão/Pix no próprio site.
      const psMode =
        paymentMethod === "pagseguro_pix"
          ? "PIX"
          : paymentMethod === "pagseguro_card"
            ? "CREDIT_CARD"
            : String(pagseguroType || "CREDIT_CARD").toUpperCase();
      const shippingAddr = {
        street: String(shippingStreet || ""),
        number: String(shippingNumber || ""),
        complement: shippingComplement ? String(shippingComplement) : undefined,
        neighborhood: String(shippingNeighborhood || ""),
        city: String(shippingCity || ""),
        state: String(shippingState || ""),
        zip: String(shippingZip || ""),
      };
      const linePs = lineItems.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      }));

      if (psMode === "PIX") {
        if (!cpf || !isValidCpf(cpf)) {
          return NextResponse.json(
            { error: "CPF válido é obrigatório para Pix PagBank" },
            { status: 400 }
          );
        }
        const ps = await createPagSeguroPixOrder({
          orderId: order.id,
          orderNumber,
          email,
          name: String(guestName),
          cpf,
          phone: guestPhone ? String(guestPhone) : null,
          amount: total,
          items: linePs,
          shipping: shippingAddr,
        });
        externalId = String(ps.id);
        pixQrCode = ps.pixQrCode;
        pixQrCodeBase64 = ps.pixQrCodeBase64;
        paymentMethodLabel = "pagseguro_pix";
        redirectUrl = ps.redirectUrl || checkoutSuccessPath(orderNumber);
      } else {
        if (!encryptedCard) {
          return NextResponse.json(
            { error: "Dados do cartão incompletos" },
            { status: 400 }
          );
        }
        const taxForCard =
          (holderTaxId ? digitsOnly(String(holderTaxId)) : null) || cpf;
        if (!taxForCard || !isValidCpf(taxForCard)) {
          return NextResponse.json(
            { error: "CPF válido é obrigatório para cartão PagBank" },
            { status: 400 }
          );
        }
        try {
          const ps = await createPagSeguroCardOrder({
            orderId: order.id,
            orderNumber,
            email,
            name: String(holderName || guestName),
            cpf: taxForCard,
            phone: guestPhone ? String(guestPhone) : null,
            amount: total,
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
            shippingCost: safeShipping,
          });
          externalId = String(ps.id);
          paymentMethodLabel = "pagseguro_card";
          if (ps.paid) {
            paymentStatus = PaymentStatus.APPROVED;
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "PAID" },
            });
          }
          redirectUrl = checkoutSuccessPath(orderNumber);
        } catch (cardErr) {
          const declined =
            cardErr instanceof Error &&
            (cardErr as { code?: string }).code === "CARD_DECLINED";
          if (declined) {
            await prisma.payment.create({
              data: {
                orderId: order.id,
                method: "pagseguro_card",
                amount: total,
                status: PaymentStatus.REJECTED,
                mercadoPagoId: undefined,
                mercadoPagoStatus: "declined",
              },
            });
            return NextResponse.json(
              {
                error:
                  cardErr instanceof Error
                    ? cardErr.message
                    : "Pagamento recusado. Verifique os dados do cartão ou escolha outro meio.",
                orderNumber,
              },
              { status: 402 }
            );
          }
          throw cardErr;
        }
      }
    } else if (paymentMethod === "infinitypay") {
      const ip = await createInfinityPayCheckout({
        orderId: order.id,
        orderNumber,
        email,
        name: String(guestName),
        phone: guestPhone ? String(guestPhone) : null,
        shippingCost: safeShipping,
        items: lineItems.map((i) => ({
          title: i.title,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      externalId = String(ip.id);
      paymentMethodLabel = "infinitypay";
      redirectUrl = ip.redirectUrl;
    } else {
      return NextResponse.json(
        { error: "Forma de pagamento não suportada" },
        { status: 400 }
      );
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethodLabel,
        amount: total,
        status: paymentStatus,
        mercadoPagoId: externalId,
        mercadoPagoStatus:
          paymentStatus === PaymentStatus.APPROVED ? "approved" : undefined,
        pixQrCode,
        pixQrCodeBase64,
        boletoUrl,
        boletoBarcode,
        paidAt:
          paymentStatus === PaymentStatus.APPROVED ? new Date() : undefined,
      },
    });

    if (paymentStatus === PaymentStatus.APPROVED) {
      await finalizeOrderStockOnPaid(order.id);
      void onOrderPaidSideEffects(order.id);
    }

    if (cartSessionId) {
      void markCartRecovered(String(cartSessionId));
    }

    void import("@/lib/order-notify")
      .then(({ notifyOrderPlaced }) => notifyOrderPlaced(order.id))
      .catch((e) => console.error("[notifyOrderPlaced]", e));

    return NextResponse.json({
      orderId: order.id,
      orderNumber,
      reserveSeconds:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : STOCK_RESERVE_SECONDS,
      reserveMinutes:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : STOCK_RESERVE_MINUTES,
      reservedUntil:
        paymentStatus === PaymentStatus.APPROVED
          ? null
          : order.reservedUntil?.toISOString?.() ?? null,
      redirectUrl:
        redirectUrl ||
        (preferenceId
          ? undefined
          : checkoutSuccessPath(orderNumber)),
      preferenceId,
      pixQrCode,
      pixQrCodeBase64,
      pixCopyPaste: pixQrCode,
      boletoUrl,
      boletoBarcode,
      paymentStatus,
    });
  } catch (err) {
    console.error(err);
    const raw = err instanceof Error ? err.message : "Erro ao criar pedido";
    return NextResponse.json(
      { error: humanizePagBankError(raw) },
      { status: 500 }
    );
  }
}
