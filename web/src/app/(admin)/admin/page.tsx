import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { startOfDay, startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);

  const [
    salesToday,
    salesMonth,
    ordersPending,
    lowStock,
    openComplaints,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: dayStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] }, createdAt: { gte: monthStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({ where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } } }),
    prisma.productVariant.findMany({
      where: { active: true, stock: { lte: 3 } },
      include: { product: true },
      take: 8,
      orderBy: { stock: "asc" },
    }),
    prisma.complaint.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
  ]);

  const monthTotal = Number(salesMonth._sum.total || 0);
  const monthCount = salesMonth._count || 0;
  const avgTicket = monthCount ? monthTotal / monthCount : 0;

  return (
    <div>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Dashboard
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat label="Vendas hoje" value={formatBRL(Number(salesToday._sum.total || 0))} sub={`${salesToday._count} pedidos`} />
        <Stat label="Vendas no mês" value={formatBRL(monthTotal)} sub={`${monthCount} pedidos`} />
        <Stat label="Ticket médio" value={formatBRL(avgTicket)} sub="mês atual" />
        <Stat label="Pendências" value={String(ordersPending)} sub={`${openComplaints} reclamações abertas`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-4">Estoque baixo</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>SKU</th>
                <th>Qtd</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.product.name} ({v.size}/{v.color})
                  </td>
                  <td>{v.sku}</td>
                  <td>{v.stock}</td>
                </tr>
              ))}
              {lowStock.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Tudo ok
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-4">Pedidos recentes</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <a href={`/admin/pedidos/${o.id}`} className="text-rose-dark">
                      {o.orderNumber}
                    </a>
                  </td>
                  <td>{o.customer?.name || o.guestName}</td>
                  <td>{formatBRL(Number(o.total))}</td>
                  <td>
                    <span className="badge">{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted mt-1">{sub}</p>
    </div>
  );
}
