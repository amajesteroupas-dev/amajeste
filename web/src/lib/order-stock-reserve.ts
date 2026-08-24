import {
  CashEntryType,
  InventoryType,
  OrderStatus,
  PaymentStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Segundos para o cliente concluir o pagamento (pedido PENDING).
 * Padrão: 5 minutos. Override: STOCK_RESERVE_SECONDS ou STOCK_RESERVE_MINUTES (legado).
 */
export const STOCK_RESERVE_SECONDS = (() => {
  const fromSeconds = Number(process.env.STOCK_RESERVE_SECONDS);
  if (Number.isFinite(fromSeconds) && fromSeconds > 0) {
    return Math.max(5, Math.min(7200, fromSeconds));
  }
  const fromMinutes = Number(process.env.STOCK_RESERVE_MINUTES);
  if (Number.isFinite(fromMinutes) && fromMinutes > 0) {
    return Math.max(5, Math.min(7200, Math.round(fromMinutes * 60)));
  }
  return 5 * 60;
})();

/** @deprecated Prefer STOCK_RESERVE_SECONDS — mantido p/ APIs antigas. */
export const STOCK_RESERVE_MINUTES = STOCK_RESERVE_SECONDS / 60;

export function reservationDeadline(from = new Date()) {
  return new Date(from.getTime() + STOCK_RESERVE_SECONDS * 1000);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Unidades em pedidos PENDING ainda no prazo, sem baixa física
 * (reserva “soft” — não altera o campo stock da variante).
 */
export async function softReservedQty(
  variantId: string,
  excludeOrderId?: string,
  client: Tx | typeof prisma = prisma
) {
  const items = await client.orderItem.findMany({
    where: {
      variantId,
      ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
      order: {
        status: OrderStatus.PENDING,
        stockHeld: false,
        reservedUntil: { gt: new Date() },
      },
    },
    select: { quantity: true },
  });
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Estoque disponível para venda (físico − reservas soft ativas). */
export async function availableStock(
  variantId: string,
  physicalStock: number,
  excludeOrderId?: string,
  client: Tx | typeof prisma = prisma
) {
  const soft = await softReservedQty(variantId, excludeOrderId, client);
  return Math.max(0, physicalStock - soft);
}

/**
 * Devolve estoque de um pedido que ainda segura unidades (legado / pós-pago).
 * Idempotente via stockHeld.
 */
export async function releaseOrderStockHold(
  orderId: string,
  reason: string,
  client: Tx | typeof prisma = prisma
) {
  const claimed = await client.order.updateMany({
    where: { id: orderId, stockHeld: true },
    data: { stockHeld: false, reservedUntil: null },
  });
  if (claimed.count === 0) {
    return { released: false, units: 0 };
  }

  const order = await client.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { released: false, units: 0 };
  }

  let units = 0;
  for (const item of order.items) {
    units += item.quantity;
    await client.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await client.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        type: InventoryType.RETURN,
        quantity: item.quantity,
        note: `${reason} · Pedido ${order.orderNumber}`,
      },
    });
  }

  return { released: true, units, orderNumber: order.orderNumber };
}

const PHYSICALLY_SOLD_STATUSES: OrderStatus[] = [
  OrderStatus.PAID,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

/** Devolve as peças ao estoque sem depender da flag stockHeld (venda manual / legado). */
async function returnOrderItemsToStock(
  orderId: string,
  reason: string,
  client: Tx | typeof prisma
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { units: 0 };
  }

  let units = 0;
  for (const item of order.items) {
    units += item.quantity;
    await client.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
    await client.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        type: InventoryType.RETURN,
        quantity: item.quantity,
        note: `${reason} · Pedido ${order.orderNumber}`,
      },
    });
  }

  return { units, orderNumber: order.orderNumber };
}

/** Estorna a receita do pedido no caixa (não apaga o lançamento original). */
async function reverseOrderCashIncome(
  orderId: string,
  orderNumber: string,
  client: Tx | typeof prisma
) {
  const existing = await client.cashEntry.findFirst({
    where: { orderId, type: CashEntryType.EXPENSE, category: "Estorno" },
  });
  if (existing) {
    return { reversed: false, amount: 0 };
  }

  const incomes = await client.cashEntry.findMany({
    where: { orderId, type: CashEntryType.INCOME },
  });
  const amount = incomes.reduce((sum, row) => sum + Number(row.amount), 0);
  if (!(amount > 0)) {
    return { reversed: false, amount: 0 };
  }

  await client.cashEntry.create({
    data: {
      type: CashEntryType.EXPENSE,
      amount,
      description: `Estorno cancelamento ${orderNumber}`,
      category: "Estorno",
      orderId,
    },
  });

  return { reversed: true, amount };
}

/**
 * Cancela pedido no admin: libera reserva soft e/ou devolve estoque físico,
 * e estorna a receita no caixa. Idempotente se já estiver cancelado.
 */
export async function cancelOrderAndReleaseStock(
  orderId: string,
  reason = "Pedido cancelado no admin",
  client: Tx | typeof prisma = prisma
) {
  const run = async (tx: Tx | typeof prisma) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, stockHeld: true, orderNumber: true },
    });
    if (!order) {
      return {
        ok: false as const,
        alreadyCancelled: false,
        units: 0,
        cashReversed: 0,
      };
    }
    if (order.status === OrderStatus.CANCELLED) {
      return {
        ok: true as const,
        alreadyCancelled: true,
        units: 0,
        cashReversed: 0,
      };
    }

    let units = 0;
    if (order.stockHeld) {
      const rel = await releaseOrderStockHold(orderId, reason, tx);
      units = rel.units;
    } else if (PHYSICALLY_SOLD_STATUSES.includes(order.status)) {
      const rel = await returnOrderItemsToStock(orderId, reason, tx);
      units = rel.units;
    }

    const cash = await reverseOrderCashIncome(orderId, order.orderNumber, tx);

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        reservedUntil: null,
        stockHeld: false,
      },
    });

    await tx.payment.updateMany({
      where: {
        orderId,
        status: { in: [PaymentStatus.PENDING, PaymentStatus.REJECTED] },
      },
      data: { status: PaymentStatus.REJECTED },
    });
    await tx.payment.updateMany({
      where: { orderId, status: PaymentStatus.APPROVED },
      data: { status: PaymentStatus.REFUNDED },
    });

    return {
      ok: true as const,
      alreadyCancelled: false,
      units,
      cashReversed: cash.amount,
      orderNumber: order.orderNumber,
    };
  };

  if (client === prisma) {
    return prisma.$transaction((tx) => run(tx));
  }
  return run(client);
}

/**
 * Baixa estoque na confirmação do pagamento.
 * - Pedidos novos (stockHeld=false): decrementa agora.
 * - Legado (já reservado na criação): só limpa o prazo.
 */
export async function finalizeOrderStockOnPaid(
  orderId: string,
  client: Tx | typeof prisma = prisma
) {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) {
    return { ok: false as const, deducted: false };
  }

  if (order.stockHeld) {
    await client.order.updateMany({
      where: { id: orderId },
      data: { reservedUntil: null },
    });
    return { ok: true as const, deducted: false };
  }

  for (const item of order.items) {
    const updated = await client.productVariant.updateMany({
      where: { id: item.variantId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (updated.count === 0) {
      throw new Error(
        `Estoque insuficiente ao confirmar o pedido ${order.orderNumber}`
      );
    }
    await client.inventoryMovement.create({
      data: {
        variantId: item.variantId,
        type: InventoryType.SALE,
        quantity: -item.quantity,
        note: `Venda Pedido ${order.orderNumber}`,
      },
    });
  }

  await client.order.update({
    where: { id: orderId },
    data: { stockHeld: true, reservedUntil: null },
  });

  return { ok: true as const, deducted: true };
}

/** @deprecated use finalizeOrderStockOnPaid */
export async function commitOrderStockHold(orderId: string) {
  return finalizeOrderStockOnPaid(orderId);
}

/**
 * Expira pedidos PENDING fora do prazo: cancela, libera baixa física (se houver)
 * e rejeita pagamento pendente.
 */
export async function expireStaleStockReservations(limit = 50) {
  const now = new Date();
  const stale = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      reservedUntil: { lte: now },
    },
    select: { id: true, orderNumber: true, stockHeld: true },
    take: limit,
    orderBy: { reservedUntil: "asc" },
  });

  const results: Array<{
    orderId: string;
    orderNumber: string;
    units: number;
  }> = [];

  for (const row of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        let units = 0;
        if (row.stockHeld) {
          const rel = await releaseOrderStockHold(
            row.id,
            "Prazo de pagamento expirado",
            tx
          );
          units = rel.units;
        } else {
          await tx.order.updateMany({
            where: { id: row.id },
            data: { reservedUntil: null },
          });
        }
        await tx.order.update({
          where: { id: row.id },
          data: { status: OrderStatus.CANCELLED },
        });
        await tx.payment.updateMany({
          where: {
            orderId: row.id,
            status: { in: [PaymentStatus.PENDING, PaymentStatus.REJECTED] },
          },
          data: { status: PaymentStatus.REJECTED },
        });
        results.push({
          orderId: row.id,
          orderNumber: row.orderNumber,
          units,
        });
      });
    } catch (err) {
      console.error("[expire-reservations]", row.orderNumber, err);
    }
  }

  return {
    expired: results.length,
    reserveSeconds: STOCK_RESERVE_SECONDS,
    reserveMinutes: STOCK_RESERVE_MINUTES,
    results,
  };
}

/** Renova o prazo para o cliente tentar pagar de novo. */
export async function renewPaymentDeadline(orderId: string) {
  await prisma.order.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.PENDING,
    },
    data: { reservedUntil: reservationDeadline() },
  });
}
