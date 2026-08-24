import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { InventoryType } from "@prisma/client";
import { generateOrderNumber } from "@/lib/order-number";
import { effectiveUnitCost, roundMoney } from "@/lib/inventory-cost";
import {
  getFinanceOpsSettings,
  packagingUnitCost,
  taxOnSalePrice,
} from "@/lib/finance-settings";
import { onOrderPaidSideEffects } from "@/lib/order-paid-effects";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

/**
 * Venda manual (WhatsApp / presencial):
 * cria pedido PAID, baixa estoque e lança receita no caixa.
 */
export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  if (itemsRaw.length === 0) {
    return NextResponse.json(
      { error: "Adicione pelo menos um produto" },
      { status: 400 }
    );
  }

  const channel = String(body.channel || "WhatsApp").trim() || "WhatsApp";
  const guestName = body.customerName
    ? String(body.customerName).trim().slice(0, 120)
    : null;
  const guestPhone = body.customerPhone
    ? String(body.customerPhone).trim().slice(0, 40)
    : null;
  const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;
  const saleDate = body.date
    ? new Date(`${String(body.date).slice(0, 10)}T12:00:00`)
    : new Date();

  type Line = {
    variantId: string;
    quantity: number;
    unitPrice: number;
    productName: string;
    size: string;
    color: string;
    unitCost: number;
    unitPackaging: number;
    unitTax: number;
  };

  const lines: Line[] = [];
  const finCosts = (await getFinanceOpsSettings()).costs;
  const packUnit = packagingUnitCost(finCosts);

  for (const raw of itemsRaw) {
    const variantId = String(raw.variantId || "").trim();
    const quantity = Math.floor(Number(raw.quantity));
    if (!variantId || !Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json(
        { error: "Item inválido (produto/quantidade)" },
        { status: 400 }
      );
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true },
    });
    if (!variant || !variant.active || variant.product.deletedAt) {
      return NextResponse.json(
        { error: "Produto/variante não encontrado" },
        { status: 404 }
      );
    }
    if (variant.stock < quantity) {
      return NextResponse.json(
        {
          error: `Estoque insuficiente: ${variant.product.name} (${variant.size}/${variant.color}) — disponível ${variant.stock}`,
        },
        { status: 400 }
      );
    }

    const defaultPrice = Number(variant.price ?? variant.product.price);
    const unitPrice =
      raw.unitPrice !== undefined && raw.unitPrice !== null && raw.unitPrice !== ""
        ? roundMoney(Number(raw.unitPrice))
        : roundMoney(defaultPrice);

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
    }

    lines.push({
      variantId,
      quantity,
      unitPrice,
      productName: variant.product.name,
      size: variant.size,
      color: variant.color,
      unitCost: effectiveUnitCost(variant.avgCost, variant.product.costPrice),
      unitPackaging: packUnit,
      unitTax: taxOnSalePrice(unitPrice, finCosts.taxPercent),
    });
  }

  const subtotal = roundMoney(
    lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0)
  );
  const orderNumber = await generateOrderNumber();
  const descItems = lines
    .map((l) => `${l.productName} ${l.size}/${l.color} ×${l.quantity}`)
    .join("; ");

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        orderNumber,
        guestName: guestName || `Cliente ${channel}`,
        guestPhone,
        status: "PAID",
        stockHeld: true,
        subtotal,
        shippingCost: 0,
        total: subtotal,
        notes: [notes, `Canal: ${channel}`].filter(Boolean).join(" · ") || null,
        createdAt: saleDate,
        items: {
          create: lines.map((l) => ({
            variantId: l.variantId,
            productName: l.productName,
            size: l.size,
            color: l.color,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            unitPackaging: l.unitPackaging,
            unitTax: l.unitTax,
            total: roundMoney(l.unitPrice * l.quantity),
          })),
        },
        payment: {
          create: {
            status: "APPROVED",
            method: channel.toLowerCase().includes("whats")
              ? "whatsapp"
              : "manual",
            amount: subtotal,
            paidAt: saleDate,
          },
        },
      },
    });

    for (const l of lines) {
      await tx.productVariant.update({
        where: { id: l.variantId },
        data: { stock: { decrement: l.quantity } },
      });
      await tx.inventoryMovement.create({
        data: {
          variantId: l.variantId,
          type: InventoryType.SALE,
          quantity: -l.quantity,
          note: `Venda ${channel} ${orderNumber}`,
          createdBy: session.user.email || undefined,
          createdAt: saleDate,
        },
      });
    }

    await tx.cashEntry.create({
      data: {
        type: "INCOME",
        amount: subtotal,
        description: `Venda ${channel} ${orderNumber}${guestName ? ` · ${guestName}` : ""} — ${descItems}`,
        category: `Venda ${channel}`,
        orderId: created.id,
        date: saleDate,
      },
    });

    return created;
  });

  void onOrderPaidSideEffects(order.id);

  void writeAuditLog({
    category: "finance",
    action: "launch",
    summary: `Venda manual ${channel} ${orderNumber} · R$ ${subtotal.toFixed(2)}`,
    entityType: "Order",
    entityId: order.id,
    detail: {
      channel,
      guestName,
      items: lines.map((l) => ({
        product: l.productName,
        qty: l.quantity,
        unitPrice: l.unitPrice,
      })),
      total: subtotal,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber,
    total: subtotal,
  });
}
