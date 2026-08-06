import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { InventoryType } from "@prisma/client";
import {
  effectiveUnitCost,
  roundMoney,
  weightedAverageCost,
} from "@/lib/inventory-cost";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const type = body.type as InventoryType;
  let quantity = Number(body.quantity);
  if (type === "OUT" || type === "SALE") quantity = -Math.abs(quantity);
  if (type === "IN" || type === "RETURN") quantity = Math.abs(quantity);

  const variant = await prisma.productVariant.findUnique({
    where: { id: body.variantId },
    include: { product: true },
  });
  if (!variant) {
    return NextResponse.json({ error: "Variante não encontrada" }, { status: 404 });
  }

  const newStock =
    type === "ADJUSTMENT"
      ? Math.max(0, Math.abs(Number(body.quantity)))
      : variant.stock + quantity;

  if (newStock < 0) {
    return NextResponse.json({ error: "Estoque insuficiente" }, { status: 400 });
  }

  const movementQty =
    type === "ADJUSTMENT" ? newStock - variant.stock : quantity;

  const isPurchaseIn =
    (type === "IN" || (type === "ADJUSTMENT" && movementQty > 0)) &&
    body.unitCost !== undefined &&
    body.unitCost !== null &&
    body.unitCost !== "";

  const unitCost = isPurchaseIn ? roundMoney(Number(body.unitCost)) : null;
  if (isPurchaseIn && (unitCost == null || unitCost < 0 || Number.isNaN(unitCost))) {
    return NextResponse.json({ error: "Custo unitário inválido" }, { status: 400 });
  }

  // Entrada de mercadoria exige custo (custo médio)
  if (type === "IN" && (unitCost == null || unitCost <= 0)) {
    return NextResponse.json(
      { error: "Informe o custo unitário da compra para atualizar o custo médio." },
      { status: 400 }
    );
  }

  const purchaseDate = body.purchaseDate
    ? new Date(String(body.purchaseDate))
    : type === "IN"
      ? new Date()
      : null;

  const addQty = movementQty > 0 ? movementQty : 0;
  const totalCost =
    unitCost != null && addQty > 0 ? roundMoney(unitCost * addQty) : null;

  let nextAvg = Number(variant.avgCost) || 0;
  if (unitCost != null && addQty > 0) {
    nextAvg = weightedAverageCost({
      oldStock: variant.stock,
      oldAvgCost: Number(variant.avgCost) || Number(variant.product.costPrice) || 0,
      addQty,
      unitCost,
    });
  }

  const registerExpense = body.registerExpense !== false && totalCost != null && totalCost > 0;
  const markPaid = body.paid !== false;

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({
      where: { id: variant.id },
      data: {
        stock: newStock,
        ...(unitCost != null && addQty > 0 ? { avgCost: nextAvg } : {}),
      },
    });

    // Sincroniza costPrice do produto com média ponderada de todas as variantes em estoque
    if (unitCost != null && addQty > 0) {
      const siblings = await tx.productVariant.findMany({
        where: { productId: variant.productId, active: true },
        select: { id: true, stock: true, avgCost: true },
      });
      let value = 0;
      let units = 0;
      for (const s of siblings) {
        const st = s.id === variant.id ? newStock : s.stock;
        const ac =
          s.id === variant.id
            ? nextAvg
            : Number(s.avgCost) || 0;
        if (st > 0 && ac > 0) {
          value += st * ac;
          units += st;
        }
      }
      const productAvg = units > 0 ? roundMoney(value / units) : nextAvg;
      await tx.product.update({
        where: { id: variant.productId },
        data: { costPrice: productAvg },
      });
    }

    const movement = await tx.inventoryMovement.create({
      data: {
        variantId: variant.id,
        type,
        quantity: movementQty,
        unitCost: unitCost ?? undefined,
        totalCost: totalCost ?? undefined,
        purchaseDate: purchaseDate || undefined,
        note: body.note || null,
        createdBy: session.user.email || undefined,
      },
    });

    let expenseId: string | null = null;
    if (registerExpense && totalCost != null && totalCost > 0) {
      const desc = `Compra estoque: ${variant.product.name} (${variant.sku}) × ${addQty}`;
      const expense = await tx.expense.create({
        data: {
          description: desc,
          amount: totalCost,
          category: "Compra de mercadoria",
          dueDate: purchaseDate || new Date(),
          paid: markPaid,
          paidAt: markPaid ? purchaseDate || new Date() : null,
          notes: body.note ? String(body.note) : null,
        },
      });
      expenseId = expense.id;
      if (markPaid) {
        await tx.cashEntry.create({
          data: {
            type: "EXPENSE",
            amount: totalCost,
            description: desc,
            category: "Compra de mercadoria",
            expenseId: expense.id,
            date: purchaseDate || new Date(),
          },
        });
      }
    }

    return {
      stock: updated.stock,
      avgCost: Number(updated.avgCost),
      movementId: movement.id,
      expenseId,
      totalCost,
    };
  });

  void writeAuditLog({
    category: "inventory",
    action: type === "ADJUSTMENT" ? "adjust" : type === "IN" ? "launch" : "update",
    summary: `Estoque ${type}: ${variant.product.name} (${variant.sku}) → ${result.stock}`,
    entityType: "ProductVariant",
    entityId: variant.id,
    detail: {
      type,
      from: variant.stock,
      to: result.stock,
      quantity: movementQty,
      note: body.note || null,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    ...result,
    avgCost:
      unitCost != null && addQty > 0
        ? nextAvg
        : effectiveUnitCost(variant.avgCost, variant.product.costPrice),
  });
}

/** Editar estoque / custo médio / mínimo de uma variante */
export async function PATCH(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const variantId = String(body.variantId || "").trim();
  if (!variantId) {
    return NextResponse.json({ error: "variantId obrigatório" }, { status: 400 });
  }

  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: true },
  });
  if (!variant) {
    return NextResponse.json({ error: "Variante não encontrada" }, { status: 404 });
  }

  const data: {
    stock?: number;
    avgCost?: number;
    minStock?: number;
  } = {};

  if (body.stock !== undefined && body.stock !== null && body.stock !== "") {
    const stock = Math.max(0, Math.floor(Number(body.stock)));
    if (Number.isNaN(stock)) {
      return NextResponse.json({ error: "Estoque inválido" }, { status: 400 });
    }
    data.stock = stock;
  }

  if (body.avgCost !== undefined && body.avgCost !== null && body.avgCost !== "") {
    const avg = roundMoney(Number(body.avgCost));
    if (Number.isNaN(avg) || avg < 0) {
      return NextResponse.json({ error: "Custo médio inválido" }, { status: 400 });
    }
    data.avgCost = avg;
  }

  if (body.minStock !== undefined && body.minStock !== null && body.minStock !== "") {
    const min = Math.max(0, Math.floor(Number(body.minStock)));
    if (Number.isNaN(min)) {
      return NextResponse.json({ error: "Estoque mínimo inválido" }, { status: 400 });
    }
    data.minStock = min;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.productVariant.update({
      where: { id: variantId },
      data,
    });

    const stockDelta =
      data.stock !== undefined ? data.stock - variant.stock : 0;

    if (stockDelta !== 0 || data.avgCost !== undefined) {
      await tx.inventoryMovement.create({
        data: {
          variantId,
          type: "ADJUSTMENT",
          quantity: stockDelta,
          unitCost: data.avgCost,
          totalCost:
            data.avgCost != null && stockDelta !== 0
              ? roundMoney(Math.abs(stockDelta) * data.avgCost)
              : undefined,
          note:
            body.note ||
            `Edição manual${data.stock !== undefined ? ` · estoque ${variant.stock} → ${data.stock}` : ""}${
              data.avgCost !== undefined
                ? ` · custo médio R$ ${data.avgCost.toFixed(2)}`
                : ""
            }`,
          createdBy: session.user.email || undefined,
        },
      });
    }

    if (data.avgCost !== undefined || data.stock !== undefined) {
      const siblings = await tx.productVariant.findMany({
        where: { productId: variant.productId, active: true },
        select: { id: true, stock: true, avgCost: true },
      });
      let value = 0;
      let units = 0;
      for (const s of siblings) {
        const st = s.id === variantId ? updated.stock : s.stock;
        const ac =
          s.id === variantId
            ? Number(updated.avgCost)
            : Number(s.avgCost) || 0;
        if (st > 0 && ac > 0) {
          value += st * ac;
          units += st;
        }
      }
      if (units > 0) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { costPrice: roundMoney(value / units) },
        });
      } else if (data.avgCost !== undefined) {
        await tx.product.update({
          where: { id: variant.productId },
          data: { costPrice: data.avgCost },
        });
      }
    }

    return updated;
  });

  void writeAuditLog({
    category: "inventory",
    action: "adjust",
    summary: `Estoque editado: ${variant.product.name} (${variant.sku})`,
    entityType: "ProductVariant",
    entityId: variantId,
    detail: {
      before: {
        stock: variant.stock,
        avgCost: Number(variant.avgCost),
        minStock: variant.minStock,
      },
      after: {
        stock: result.stock,
        avgCost: Number(result.avgCost),
        minStock: result.minStock,
      },
      note: body.note || null,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    stock: result.stock,
    avgCost: Number(result.avgCost),
    minStock: result.minStock,
  });
}
