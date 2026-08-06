import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const ORDER_SEQ_KEY = "order_sequence";
const ORDER_SEQ_VERSION_KEY = "order_sequence_version";
/** Versão 2: números a partir de 1632 (4 dígitos) para o lançamento. */
const ORDER_SEQ_VERSION = "2";
/** Primeiro número público da loja (ex.: 1632, 1633…). */
export const ORDER_NUMBER_START = 1632;

function formatOrderNumber(n: number) {
  return String(n).padStart(4, "0");
}

/**
 * Renumerar pedidos a partir de ORDER_NUMBER_START e alinhar o contador.
 * Roda uma vez (versão 2) ou se o contador ainda não existir.
 */
async function ensureSequenceInitialized(tx: Prisma.TransactionClient) {
  const version = await tx.siteSetting.findUnique({
    where: { key: ORDER_SEQ_VERSION_KEY },
  });
  if (version?.value === ORDER_SEQ_VERSION) {
    const seq = await tx.siteSetting.findUnique({
      where: { key: ORDER_SEQ_KEY },
    });
    if (seq) return;
  }

  const orders = await tx.order.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  for (const o of orders) {
    await tx.order.update({
      where: { id: o.id },
      data: { orderNumber: `__mig_${o.id}` },
    });
  }
  for (let i = 0; i < orders.length; i++) {
    await tx.order.update({
      where: { id: orders[i].id },
      data: { orderNumber: formatOrderNumber(ORDER_NUMBER_START + i) },
    });
  }

  const next = ORDER_NUMBER_START + orders.length;
  await tx.siteSetting.upsert({
    where: { key: ORDER_SEQ_KEY },
    create: { key: ORDER_SEQ_KEY, value: String(next) },
    update: { value: String(next) },
  });
  await tx.siteSetting.upsert({
    where: { key: ORDER_SEQ_VERSION_KEY },
    create: { key: ORDER_SEQ_VERSION_KEY, value: ORDER_SEQ_VERSION },
    update: { value: ORDER_SEQ_VERSION },
  });
}

/** Garante sequência iniciada (útil ao abrir o admin). */
export async function ensureSequentialOrderNumbers() {
  await prisma.$transaction(async (tx) => {
    await ensureSequenceInitialized(tx);
  });
}

/**
 * Próximo número de pedido (1632, 1633… — sempre com pelo menos 4 dígitos).
 */
export async function generateOrderNumber(): Promise<string> {
  return prisma.$transaction(async (tx) => {
    await ensureSequenceInitialized(tx);

    await tx.$executeRaw`
      SELECT 1 FROM "SiteSetting" WHERE key = ${ORDER_SEQ_KEY} FOR UPDATE
    `;
    const locked = await tx.siteSetting.findUniqueOrThrow({
      where: { key: ORDER_SEQ_KEY },
    });
    const next = parseInt(locked.value, 10);
    if (!Number.isFinite(next) || next < ORDER_NUMBER_START) {
      throw new Error("Contador de pedidos inválido");
    }
    await tx.siteSetting.update({
      where: { key: ORDER_SEQ_KEY },
      data: { value: String(next + 1) },
    });
    return formatOrderNumber(next);
  });
}
