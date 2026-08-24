import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCpf } from "@/lib/cpf";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await prisma.customer.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { orders: true, notes: true, complaints: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Clientes / CRM
      </h1>
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Pedidos</th>
              <th>Notas</th>
              <th>Reclamações</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/clientes/${c.id}`} className="text-rose-dark">
                    {c.name}
                  </Link>
                </td>
                <td className="font-mono text-xs">
                  {c.cpf ? formatCpf(c.cpf) : "—"}
                </td>
                <td>{c.email}</td>
                <td>{c.phone || "—"}</td>
                <td>{c._count.orders}</td>
                <td>{c._count.notes}</td>
                <td>{c._count.complaints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
