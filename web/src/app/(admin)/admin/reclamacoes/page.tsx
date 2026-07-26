import { prisma } from "@/lib/prisma";
import { ComplaintForm } from "@/components/admin/ComplaintForm";
import { ComplaintStatusForm } from "@/components/admin/ComplaintStatusForm";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  const [complaints, customers, orders] = await Promise.all([
    prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, order: true },
      take: 50,
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, take: 200 }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, orderNumber: true, customerId: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl mb-6" style={{ fontFamily: "var(--font-display)" }}>
        Reclamações / Trocas
      </h1>
      <ComplaintForm
        customers={customers.map((c) => ({ id: c.id, name: c.name, email: c.email }))}
        orders={orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerId: o.customerId,
        }))}
      />
      <div className="mt-8 border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Cliente</th>
              <th>Tipo</th>
              <th>Assunto</th>
              <th>Pedido</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td>{c.createdAt.toLocaleDateString("pt-BR")}</td>
                <td>{c.customer.name}</td>
                <td>{c.type}</td>
                <td>
                  <div className="font-medium">{c.subject}</div>
                  <div className="text-xs text-muted max-w-xs truncate">{c.description}</div>
                </td>
                <td>{c.order?.orderNumber || "—"}</td>
                <td>
                  <span className="badge">{c.status}</span>
                </td>
                <td>
                  <ComplaintStatusForm id={c.id} status={c.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
