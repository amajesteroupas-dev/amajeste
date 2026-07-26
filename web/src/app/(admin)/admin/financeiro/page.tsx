import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { ExpenseForm } from "@/components/admin/ExpenseForm";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const monthStart = startOfMonth(new Date());

  const [income, expenses, cashEntries, unpaidExpenses, paidOrders] = await Promise.all([
    prisma.cashEntry.aggregate({
      where: { type: "INCOME", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.cashEntry.aggregate({
      where: { type: "EXPENSE", date: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.cashEntry.findMany({
      orderBy: { date: "desc" },
      take: 40,
    }),
    prisma.expense.findMany({
      where: { paid: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        createdAt: { gte: monthStart },
      },
      include: { items: { include: { variant: { include: { product: true } } } } },
    }),
  ]);

  let cogs = 0;
  for (const order of paidOrders) {
    for (const item of order.items) {
      cogs += Number(item.variant.product.costPrice) * item.quantity;
    }
  }

  const revenue = Number(income._sum.amount || 0);
  const expenseTotal = Number(expenses._sum.amount || 0);
  const grossProfit = revenue - cogs;
  const net = revenue - expenseTotal;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Financeiro
        </h1>
        <a href="/api/admin/finance/export" className="btn btn-outline">
          Exportar CSV
        </a>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card label="Receitas (mês)" value={formatBRL(revenue)} />
        <Card label="Despesas (mês)" value={formatBRL(expenseTotal)} />
        <Card label="Lucro bruto" value={formatBRL(grossProfit)} sub="receita − CMV" />
        <Card label="Saldo caixa" value={formatBRL(net)} sub="receitas − despesas" />
      </div>

      <ExpenseForm />

      <div className="grid gap-6 lg:grid-cols-2 mt-8">
        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-3">Contas a pagar</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Venc.</th>
              </tr>
            </thead>
            <tbody>
              {unpaidExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{e.description}</td>
                  <td>{formatBRL(Number(e.amount))}</td>
                  <td>{e.dueDate ? e.dueDate.toLocaleDateString("pt-BR") : "—"}</td>
                </tr>
              ))}
              {unpaidExpenses.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Nenhuma conta aberta
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-3">Fluxo de caixa</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Desc</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {cashEntries.map((e) => (
                <tr key={e.id}>
                  <td>{e.date.toLocaleDateString("pt-BR")}</td>
                  <td>{e.type}</td>
                  <td>{e.description}</td>
                  <td>{formatBRL(Number(e.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="border border-line bg-surface p-5">
      <p className="text-xs uppercase tracking-wider text-muted mb-2">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
