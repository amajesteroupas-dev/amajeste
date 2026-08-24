import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import { checkoutSuccessPath } from "@/lib/order-access";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  expireStaleStockReservations,
  releaseOrderStockHold,
  reservationDeadline,
} from "@/lib/order-stock-reserve";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus pedidos" };

export default async function ContaPedidosPage() {
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

  // Reabre prazo dos pedidos do cliente ainda pendentes (para poder pagar)
  // e libera baixa física legada (estoque volta à prateleira até confirmar pagamento).
  const pendingMine = await prisma.order.findMany({
    where: {
      customerId: customer.id,
      status: OrderStatus.PENDING,
      OR: [
        { payment: null },
        { payment: { status: { not: PaymentStatus.APPROVED } } },
      ],
      createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    select: { id: true, reservedUntil: true, stockHeld: true },
  });
  for (const o of pendingMine) {
    if (o.stockHeld) {
      await releaseOrderStockHold(
        o.id,
        "Estoque liberado — aguardando pagamento"
      );
    }
    if (!o.reservedUntil || o.reservedUntil.getTime() <= Date.now() || o.stockHeld) {
      await prisma.order.update({
        where: { id: o.id },
        data: { reservedUntil: reservationDeadline(), stockHeld: false },
      });
    }
  }

  await expireStaleStockReservations(30);

  const orders = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { items: true, payment: true, shipment: true },
  });

  return (
    <div className="space-y-4">
      <h2
        className="text-xl text-[#2a2420]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pedidos
      </h2>
      {orders.length === 0 ? (
        <p className="text-sm text-[#5c534c]">Nenhum pedido encontrado.</p>
      ) : (
        orders.map((o) => {
          const track =
            o.trackingCode || o.shipment?.trackingCode || null;
          const canPay =
            o.status === OrderStatus.PENDING &&
            o.payment?.status !== PaymentStatus.APPROVED;
          return (
            <article
              key={o.id}
              className="border border-[#2a2420]/08 bg-[#faf7f3]/50 p-5 space-y-2"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">#{o.orderNumber}</p>
                  <p className="text-[11px] text-[#8a7468]">
                    {formatDateTimeBR(o.createdAt, { seconds: true })} ·{" "}
                    {orderStatusLabel(o.status)}
                  </p>
                </div>
                <p className="font-semibold">{formatBRL(Number(o.total))}</p>
              </div>
              <ul className="text-xs text-[#5c534c] space-y-1">
                {o.items.map((i) => (
                  <li key={i.id}>
                    {i.productName} · {i.size}/{i.color} × {i.quantity}
                  </li>
                ))}
              </ul>
              {o.payment ? (
                <p className="text-[11px] text-[#8a7468]">
                  Pagamento: {paymentMethodLabel(o.payment.method)} ·{" "}
                  {paymentStatusLabel(o.payment.status)}
                </p>
              ) : (
                <p className="text-[11px] text-[#8a7468]">
                  Pagamento: aguardando
                </p>
              )}
              <div className="flex flex-wrap gap-3 pt-1 text-xs items-center">
                {canPay ? (
                  <Link
                    href={`/checkout/pagar/${encodeURIComponent(o.orderNumber)}`}
                    className="inline-flex items-center bg-[#95752c] text-white px-3 py-1.5 text-xs tracking-wide hover:bg-[#7d6324]"
                  >
                    Pagar pedido
                  </Link>
                ) : null}
                <Link
                  href={checkoutSuccessPath(o.orderNumber)}
                  className="underline text-[#95752c]"
                >
                  Comprovante
                </Link>
                {track ? (
                  <Link
                    href={`/rastreio?codigo=${encodeURIComponent(track)}&pedido=${encodeURIComponent(o.orderNumber)}`}
                    className="underline text-[#95752c]"
                  >
                    Rastrear pedido
                  </Link>
                ) : (
                  <Link
                    href={`/rastreio?pedido=${encodeURIComponent(o.orderNumber)}`}
                    className="underline text-[#8a7468]"
                  >
                    Ver status de entrega
                  </Link>
                )}
              </div>
              {track ? (
                <p className="text-[11px] font-mono text-[#5c534c]">
                  Código: {track}
                </p>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}
