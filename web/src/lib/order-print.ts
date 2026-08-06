import { prisma } from "@/lib/prisma";
import { getFinanceOpsSettings } from "@/lib/finance-settings";
import { formatBRL } from "@/lib/utils";

function buildReceiptHtml(order: {
  orderNumber: string;
  guestName: string | null;
  guestPhone: string | null;
  total: number;
  subtotal: number;
  shippingCost: number;
  discount: number;
  createdAt: Date;
  items: {
    productName: string;
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  paymentMethod?: string | null;
}) {
  const lines = order.items
    .map(
      (i) =>
        `<tr><td>${i.productName}<br/><small>${i.size}/${i.color}</small></td><td>${i.quantity}</td><td>${formatBRL(i.total)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>Pedido ${order.orderNumber}</title>
<style>
  body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;width:280px;margin:0;padding:8px;color:#111}
  h1{font-size:14px;margin:0 0 8px}
  table{width:100%;border-collapse:collapse}
  td{padding:3px 0;vertical-align:top}
  .muted{color:#555}
  .total{font-weight:700;font-size:13px;margin-top:8px;border-top:1px dashed #333;padding-top:6px}
</style></head><body>
  <h1>Majesté · Pedido ${order.orderNumber}</h1>
  <p class="muted">${order.createdAt.toLocaleString("pt-BR")}</p>
  <p>${order.guestName || "Cliente"}${order.guestPhone ? ` · ${order.guestPhone}` : ""}</p>
  <table>${lines}</table>
  <div class="total">
    <div>Subtotal ${formatBRL(order.subtotal)}</div>
    <div>Frete ${formatBRL(order.shippingCost)}</div>
    ${order.discount > 0 ? `<div>Desconto −${formatBRL(order.discount)}</div>` : ""}
    <div>TOTAL ${formatBRL(order.total)}</div>
    ${order.paymentMethod ? `<div class="muted">${order.paymentMethod}</div>` : ""}
  </div>
</body></html>`;
}

/** Enfileira (e tenta enviar) impressão do pedido. */
export async function enqueueOrderPrint(orderId: string) {
  const cfg = (await getFinanceOpsSettings()).print;
  if (!cfg.enabled) {
    return { skipped: true as const };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!order) throw new Error("Pedido não encontrado");

  const html = buildReceiptHtml({
    orderNumber: order.orderNumber,
    guestName: order.guestName,
    guestPhone: order.guestPhone,
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    shippingCost: Number(order.shippingCost),
    discount: Number(order.discount),
    createdAt: order.createdAt,
    paymentMethod: order.payment?.method,
    items: order.items.map((i) => ({
      productName: i.productName,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      total: Number(i.total),
    })),
  });

  const job = await prisma.printJob.create({
    data: {
      orderId,
      status: "PENDING",
      provider: cfg.provider,
      payload: html,
    },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { printStatus: "QUEUED" },
  });

  if (
    cfg.provider === "printnode" &&
    cfg.printNodeApiKey &&
    cfg.printNodePrinterId
  ) {
    try {
      // PrintNode: envia como texto URI para abrir no driver (melhor caminho: PDF).
      // Usamos contentType "raw_uri" não aplicável — preferimos fila + página admin imprimir.
      const auth = Buffer.from(`${cfg.printNodeApiKey}:`).toString("base64");
      const res = await fetch("https://api.printnode.com/printjobs", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          printerId: Number(cfg.printNodePrinterId),
          title: `Pedido ${order.orderNumber}`,
          contentType: "raw_base64",
          content: Buffer.from(
            // ESC/POS-ish plain text fallback
            [
              `Majeste - Pedido ${order.orderNumber}`,
              order.createdAt.toLocaleString("pt-BR"),
              order.guestName || "",
              ...order.items.map(
                (i) =>
                  `${i.quantity}x ${i.productName} ${i.size}/${i.color} ${formatBRL(Number(i.total))}`
              ),
              `TOTAL ${formatBRL(Number(order.total))}`,
              "",
            ].join("\n"),
            "utf8"
          ).toString("base64"),
          source: "Majeste Web",
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`PrintNode ${res.status}: ${errText.slice(0, 180)}`);
      }
      const externalId = String(await res.json());
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: "SENT", externalId },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { printStatus: "PRINTED", printedAt: new Date() },
      });
      return { ok: true as const, jobId: job.id, externalId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha PrintNode";
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: msg },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { printStatus: "ERROR" },
      });
      return { ok: false as const, jobId: job.id, error: msg };
    }
  }

  return { ok: true as const, jobId: job.id, queued: true as const };
}

export async function maybeAutoPrintOrder(orderId: string) {
  const cfg = (await getFinanceOpsSettings()).print;
  if (!cfg.enabled || !cfg.autoOnPaid) return { skipped: true as const };
  return enqueueOrderPrint(orderId);
}

export { buildReceiptHtml };
