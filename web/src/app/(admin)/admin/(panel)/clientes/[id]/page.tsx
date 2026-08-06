import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { CustomerNoteForm } from "@/components/admin/CustomerNoteForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      notes: { orderBy: { createdAt: "desc" } },
      complaints: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl mb-1" style={{ fontFamily: "var(--font-display)" }}>
        {customer.name}
      </h1>
      <p className="text-sm text-muted mb-6">
        {customer.email} · {customer.phone || "sem telefone"}
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-3">Timeline de contatos</h2>
          <CustomerNoteForm customerId={customer.id} />
          <ul className="mt-4 space-y-3">
            {customer.notes.map((n) => (
              <li key={n.id} className="border-b border-line pb-3 text-sm">
                <div className="flex justify-between gap-2 text-xs text-muted mb-1">
                  <span className="badge">{n.channel}</span>
                  <span>{n.createdAt.toLocaleString("pt-BR")}</span>
                </div>
                <p>{n.content}</p>
              </li>
            ))}
            {customer.notes.length === 0 && (
              <li className="text-sm text-muted">Nenhum contato registrado.</li>
            )}
          </ul>
        </section>

        <section className="border border-line bg-surface p-5">
          <h2 className="font-semibold mb-3">Pedidos</h2>
          <ul className="space-y-2 text-sm">
            {customer.orders.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <a href={`/admin/pedidos/${o.id}`} className="text-rose-dark">
                  {o.orderNumber}
                </a>
                <span>
                  {formatBRL(Number(o.total))} · {o.status}
                </span>
              </li>
            ))}
          </ul>
          <h2 className="font-semibold mb-3 mt-6">Reclamações</h2>
          <ul className="space-y-2 text-sm">
            {customer.complaints.map((c) => (
              <li key={c.id}>
                <span className="badge mr-2">{c.status}</span>
                {c.subject}
              </li>
            ))}
            {customer.complaints.length === 0 && (
              <li className="text-muted">Nenhuma reclamação.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
