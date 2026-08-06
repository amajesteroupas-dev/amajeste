import { InventoryType, OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Minutos de reserva de estoque para pedido PENDING sem pagamento. */
export const STOCK_RESERVE_MINUTES = Math.max(
  3,
  Math.min(60, Number(process.env.STOCK_RESERVE_MINUTES || 10) || 10)
);

export function reservationDeadline(from = new Date()) {
  return new Date(from.getTime() + STOCK_RESERVE_MINUTES * 60 * 1000);
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/**
 * Devolve estoque de um pedido que ainda segura unidades (reserva ou cancelamento).
 * Idempotente via stockHeld.
 */
export async function releaseOrderStockHold(
  orderId: string,
  reason: string,
  client: Tx | typeof prisma = prisma
) {
  // Claim atômico: evita double-release se expire/cron/checkout correrem juntos
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

/** Confirma venda: estoque já baixado fica permanente. */
export async function commitOrderStockHold(orderId: string) {
  await prisma.order.updateMany({
    where: { id: orderId, stockHeld: true },
    data: { reservedUntil: null },
  });
}

/**
 * Expira reservas PENDING vencidas: cancela pedido, libera estoque e rejeita pagamento.
 */
export async function expireStaleStockReservations(limit = 50) {
  const now = new Date();
  const stale = await prisma.order.findMany({
    where: {
      status: OrderStatus.PENDING,
      stockHeld: true,
      reservedUntil: { lte: now },
    },
    select: { id: true, orderNumber: true },
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
        const rel = await releaseOrderStockHold(
          row.id,
          "Reserva expirada (sem pagamento)",
          tx
        );
        await tx.order.update({
          where: { id: row.id },
          data: { status: OrderStatus.CANCELLED },
        });
        await tx.payment.updateMany({
          where: {
            orderId: row.id,
            status: PaymentStatus.PENDING,
          },
          data: { status: PaymentStatus.REJECTED },
        });
        if (rel.released) {
          results.push({
            orderId: row.id,
            orderNumber: row.orderNumber,
            units: rel.units,
          });
        }
      });
    } catch (err) {
      console.error("[expire-reservations]", row.orderNumber, err);
    }
  }

  return {
    expired: results.length,
    reserveMinutes: STOCK_RESERVE_MINUTES,
    results,
  };
}
