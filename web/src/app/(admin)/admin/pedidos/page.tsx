import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
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
                <td>{o.createdAt.toLocaleString("pt-BR")}</td>
                <td>{o.customer?.name || o.guestName}</td>
                <td>{formatBRL(Number(o.total))}</td>
                <td>{o.payment?.method || "—"}</td>
                <td>
                  <span className="badge">{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
