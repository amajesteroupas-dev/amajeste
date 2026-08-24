import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { ensureSequentialOrderNumbers } from "@/lib/order-number";
import {
  orderStatusLabel,
  paymentMethodLabel,
} from "@/lib/order-labels";
import { checkoutSuccessPath } from "@/lib/order-access";
import { CancelOrderButton } from "@/components/admin/CancelOrderButton";

export const dynamic = "force-dynamic";

const CANCELLABLE = new Set(["PENDING", "PAID", "PROCESSING"]);

export default async function OrdersPage() {
  await ensureSequentialOrderNumbers();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, payment: true },
    take: 100,
  });

  return (
    <div>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Pedidos
      </h1>
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>Pagamento</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/pedidos/${o.id}`} className="text-rose-dark">
                    {o.orderNumber}
                  </Link>
                </td>
                <td>{formatDateTimeBR(o.createdAt, { seconds: true })}</td>
                <td>{o.customer?.name || o.guestName}</td>
                <td>{formatBRL(Number(o.total))}</td>
                <td>{paymentMethodLabel(o.payment?.method)}</td>
                <td>
                  <span className="badge">{orderStatusLabel(o.status)}</span>
                </td>
                <td>
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={checkoutSuccessPath(o.orderNumber)}
                      target="_blank"
                      className="text-xs underline text-muted hover:text-ink"
                    >
                      Comprovante
                    </Link>
                    {CANCELLABLE.has(o.status) ? (
                      <CancelOrderButton
                        orderId={o.id}
                        orderNumber={o.orderNumber}
                        compact
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
