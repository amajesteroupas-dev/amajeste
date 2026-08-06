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

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus pedidos" };

export default async function ContaPedidosPage() {
  const customer = await requireCustomer();
  if (!customer) redirect("/entrar");

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
              ) : null}
              <div className="flex flex-wrap gap-3 pt-1 text-xs">
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
