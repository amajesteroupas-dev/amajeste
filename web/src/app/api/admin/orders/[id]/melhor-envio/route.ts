import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getMelhorEnvioConfig } from "@/lib/melhor-envio-settings";
import {
  fetchMelhorEnvioAccount,
  getStoreSender,
  meFetch,
} from "@/lib/melhor-envio-api";
import {
  DEFAULT_SHIPPING_DIMS,
  isLocalShippingId,
  resolveMelhorEnvioServiceId,
} from "@/lib/shipping";

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

type Props = { params: Promise<{ id: string }> };

/**
 * Gera etiqueta no Melhor Envio:
 * cart → checkout (saldo) → generate → print
 */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "create"); // create | print | refresh

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          variant: { include: { product: true } },
        },
      },
      shipment: true,
      customer: true,
      payment: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });
  }

  if (isLocalShippingId(order.shippingServiceId)) {
    return NextResponse.json(
      {
        error:
          "Este pedido é entrega local (Planaltina/Sobradinho). Combine pelo WhatsApp — não gera etiqueta dos Correios.",
      },
      { status: 400 }
    );
  }

  const cfg = await getMelhorEnvioConfig();
  if (!cfg.token) {
    return NextResponse.json(
      { error: "Configure o token Melhor Envio em Frete" },
      { status: 400 }
    );
  }

  // Só reimprimir
  if (action === "print" && order.shipment?.melhorEnvioId) {
    const printRes = await meFetch("/me/shipment/print", {
      method: "POST",
      cfg,
      body: JSON.stringify({
        mode: "public",
        orders: [order.shipment.melhorEnvioId],
      }),
    });
    const printData = await printRes.json().catch(() => ({}));
    if (!printRes.ok) {
      return NextResponse.json(
        {
          error:
            (printData as { message?: string }).message ||
            "Falha ao obter link de impressão",
        },
        { status: 502 }
      );
    }
    const labelUrl =
      (printData as { url?: string }).url ||
      (Array.isArray((printData as { url?: string[] }).url)
        ? (printData as { url: string[] }).url[0]
        : null);
    if (labelUrl) {
      await prisma.shipment.update({
        where: { orderId: order.id },
        data: { labelUrl },
      });
    }
    return NextResponse.json({
      ok: true,
      melhorEnvioId: order.shipment.melhorEnvioId,
      labelUrl: labelUrl || order.shipment.labelUrl,
    });
  }

  if (order.shipment?.melhorEnvioId && action !== "create") {
    return NextResponse.json({
      ok: true,
      melhorEnvioId: order.shipment.melhorEnvioId,
      labelUrl: order.shipment.labelUrl,
      trackingCode: order.shipment.trackingCode || order.trackingCode,
    });
  }

  const overrideService = Number(body.service);
  const serviceId =
    Number.isFinite(overrideService) && overrideService > 0
      ? overrideService
      : resolveMelhorEnvioServiceId(
          order.shippingServiceId,
          order.shippingMethod
        );
  if (!serviceId) {
    return NextResponse.json(
      {
        error:
          "Pedido sem serviço Melhor Envio (PAC/SEDEX). Peça um novo frete no checkout ou informe o serviço manualmente.",
      },
      { status: 400 }
    );
  }

  const sender = await getStoreSender(cfg);
  if (!sender.document || sender.document.length < 11) {
    return NextResponse.json(
      {
        error:
          "Cadastre o CPF/CNPJ do remetente em Frete / Melhor Envio (dados da loja).",
      },
      { status: 400 }
    );
  }
  if (!sender.address.trim()) {
    return NextResponse.json(
      {
        error:
          "Cadastre o endereço completo da loja (remetente) em Frete / Melhor Envio.",
      },
      { status: 400 }
    );
  }

  const recipientDoc = (order.customer?.cpf || "").replace(/\D/g, "");
  const toName = order.customer?.name || order.guestName || "Cliente";
  const toEmail = order.guestEmail || order.customer?.email || sender.email;
  const toPhone = (
    order.guestPhone ||
    order.customer?.phone ||
    ""
  ).replace(/\D/g, "");

  if (!order.shippingZip || !order.shippingStreet) {
    return NextResponse.json(
      { error: "Pedido sem endereço de entrega completo" },
      { status: 400 }
    );
  }

  let insurance = 0;
  const products = order.items.map((item) => {
    insurance += Number(item.total);
    return {
      name: `${item.productName} (${item.size}/${item.color})`.slice(0, 255),
      quantity: item.quantity,
      unitary_value: Number(item.unitPrice),
    };
  });

  let height = 0;
  let width = 0;
  let length = 0;
  let weight = 0;
  for (const item of order.items) {
    const p = item.variant.product;
    const h = p.heightCm && p.heightCm > 0 ? p.heightCm : DEFAULT_SHIPPING_DIMS.heightCm;
    const w = p.widthCm && p.widthCm > 0 ? p.widthCm : DEFAULT_SHIPPING_DIMS.widthCm;
    const l = p.lengthCm && p.lengthCm > 0 ? p.lengthCm : DEFAULT_SHIPPING_DIMS.lengthCm;
    const kg =
      p.weightKg && p.weightKg > 0 ? p.weightKg : DEFAULT_SHIPPING_DIMS.weightKg;
    height = Math.max(height, h);
    width = Math.max(width, w);
    length = Math.max(length, l);
    weight += kg * item.quantity;
  }

  const cartPayload = {
    service: serviceId,
    from: {
      name: sender.name,
      phone: sender.phone.slice(-11),
      email: sender.email,
      document: sender.document,
      address: sender.address,
      number: sender.number || "S/N",
      complement: sender.complement || "",
      district: sender.district,
      city: sender.city,
      country_id: "BR",
      postal_code: sender.postal_code,
      state_abbr: sender.state,
    },
    to: {
      name: toName,
      phone: toPhone.slice(-11) || sender.phone.slice(-11),
      email: toEmail,
      document: recipientDoc || sender.document,
      address: order.shippingStreet,
      number: order.shippingNumber || "S/N",
      complement: order.shippingComplement || "",
      district: order.shippingNeighborhood || "Centro",
      city: order.shippingCity || "",
      country_id: "BR",
      postal_code: String(order.shippingZip).replace(/\D/g, ""),
      state_abbr: String(order.shippingState || "").toUpperCase().slice(0, 2),
    },
    products,
    volumes: [
      {
        height: Math.max(1, Math.round(height)),
        width: Math.max(1, Math.round(width)),
        length: Math.max(1, Math.round(length)),
        weight: Math.max(0.1, Number(weight.toFixed(3))),
      },
    ],
    options: {
      insurance_value: Math.max(0, Math.round(insurance * 100) / 100),
      receipt: false,
      own_hand: false,
      reverse: false,
      non_commercial: true,
    },
  };

  const cartRes = await meFetch("/me/cart", {
    method: "POST",
    cfg,
    body: JSON.stringify(cartPayload),
  });
  const cartData = await cartRes.json().catch(() => ({}));
  if (!cartRes.ok) {
    console.error("ME cart error", cartRes.status, cartData);
    return NextResponse.json(
      {
        error:
          (cartData as { message?: string; error?: string }).message ||
          (cartData as { error?: string }).error ||
          `Falha ao adicionar ao carrinho Melhor Envio (${cartRes.status})`,
        detail: cartData,
      },
      { status: 502 }
    );
  }

  const meId = String(
    (cartData as { id?: string }).id ||
      (cartData as { purchase?: { id?: string } }).purchase?.id ||
      ""
  );
  if (!meId) {
    return NextResponse.json(
      { error: "Melhor Envio não retornou ID da etiqueta", detail: cartData },
      { status: 502 }
    );
  }

  // Checkout (debita saldo)
  const checkoutRes = await meFetch("/me/shipment/checkout", {
    method: "POST",
    cfg,
    body: JSON.stringify({ orders: [meId] }),
  });
  const checkoutData = await checkoutRes.json().catch(() => ({}));
  if (!checkoutRes.ok) {
    console.error("ME checkout error", checkoutRes.status, checkoutData);
    const account = await fetchMelhorEnvioAccount();
    return NextResponse.json(
      {
        error:
          (checkoutData as { message?: string }).message ||
          `Falha ao comprar etiqueta. Verifique o saldo Melhor Envio (atual: R$ ${Number(account.balance || 0).toFixed(2)}).`,
        detail: checkoutData,
        melhorEnvioId: meId,
      },
      { status: 502 }
    );
  }

  // Generate
  const genRes = await meFetch("/me/shipment/generate", {
    method: "POST",
    cfg,
    body: JSON.stringify({ orders: [meId] }),
  });
  const genData = await genRes.json().catch(() => ({}));
  if (!genRes.ok) {
    console.error("ME generate error", genRes.status, genData);
    await prisma.shipment.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        carrier: "Correios",
        service: String(serviceId),
        melhorEnvioId: meId,
      },
      update: {
        carrier: "Correios",
        service: String(serviceId),
        melhorEnvioId: meId,
      },
    });
    return NextResponse.json(
      {
        error:
          (genData as { message?: string }).message ||
          "Etiqueta comprada, mas falhou a geração. Tente 'Imprimir' em seguida.",
        melhorEnvioId: meId,
        detail: genData,
      },
      { status: 502 }
    );
  }

  // Print link
  const printRes = await meFetch("/me/shipment/print", {
    method: "POST",
    cfg,
    body: JSON.stringify({ mode: "public", orders: [meId] }),
  });
  const printData = await printRes.json().catch(() => ({}));
  const labelUrl =
    typeof (printData as { url?: string }).url === "string"
      ? (printData as { url: string }).url
      : null;

  // Tracking from generate response if present
  const tracking =
    (genData as Record<string, { tracking?: string }>)?.[meId]?.tracking ||
    (cartData as { tracking?: string }).tracking ||
    null;

  await prisma.shipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      carrier: "Correios",
      service: String(serviceId),
      melhorEnvioId: meId,
      labelUrl,
      trackingCode: tracking,
      shippedAt: new Date(),
    },
    update: {
      carrier: "Correios",
      service: String(serviceId),
      melhorEnvioId: meId,
      labelUrl,
      trackingCode: tracking || undefined,
      shippedAt: new Date(),
    },
  });

  if (tracking) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        trackingCode: tracking,
        status:
          order.status === "PAID" || order.status === "PROCESSING"
            ? "SHIPPED"
            : order.status,
      },
    });
  }

  let notify = null;
  if (tracking) {
    try {
      const { notifyOrderShipped } = await import("@/lib/order-notify");
      notify = await notifyOrderShipped(order.id);
    } catch {
      notify = null;
    }
  }

  return NextResponse.json({
    ok: true,
    melhorEnvioId: meId,
    labelUrl,
    trackingCode: tracking,
    checkout: checkoutData,
    notify,
  });
}

export async function GET(_req: NextRequest, { params }: Props) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { shipment: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  return NextResponse.json({
    shippingMethod: order.shippingMethod,
    shippingServiceId: order.shippingServiceId,
    local: isLocalShippingId(order.shippingServiceId),
    shipment: order.shipment,
  });
}
