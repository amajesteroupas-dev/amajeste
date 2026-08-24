import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { formatCpf } from "@/lib/cpf";
import { CustomerNoteForm } from "@/components/admin/CustomerNoteForm";
import { CustomerAdminActions } from "@/components/admin/CustomerAdminActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, role: true, createdAt: true } },
      addresses: { orderBy: [{ isDefault: "desc" }, { id: "asc" }] },
      orders: { orderBy: { createdAt: "desc" }, take: 20 },
      notes: { orderBy: { createdAt: "desc" } },
      complaints: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  const hasStoreAccount =
    !!customer.user && customer.user.role === "CUSTOMER";

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1
          className="text-3xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {customer.name}
        </h1>
        <p className="text-sm text-muted">
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ""}
          {customer.cpf ? ` · CPF ${formatCpf(customer.cpf)}` : " · CPF não informado"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-surface p-5">
          <CustomerAdminActions
            customerId={customer.id}
            name={customer.name}
            email={customer.email}
            phone={customer.phone || ""}
            cpf={customer.cpf || ""}
            hasStoreAccount={hasStoreAccount}
          />

          <div className="mt-6 border-t border-line pt-5 space-y-2 text-sm">
            <h2 className="font-semibold mb-2">Resumo</h2>
            <p>
              <strong>CPF:</strong>{" "}
              {customer.cpf ? (
                <code className="font-mono">{formatCpf(customer.cpf)}</code>
              ) : (
                <span className="text-rose-dark">Não informado — preencha acima</span>
              )}
            </p>
            <p>
              <strong>Conta na loja:</strong>{" "}
              {hasStoreAccount ? "Sim" : "Não (somente convidada)"}
            </p>
            {customer.birthDate ? (
              <p>
                <strong>Nascimento:</strong>{" "}
                {customer.birthDate.toLocaleDateString("pt-BR")}
              </p>
            ) : null}
            {customer.ambassadorDiscountPercent > 0 ? (
              <p>
                <strong>Desconto embaixadora:</strong>{" "}
                {customer.ambassadorDiscountPercent}%
              </p>
            ) : null}
            {customer.tags.length > 0 ? (
              <p>
                <strong>Tags:</strong> {customer.tags.join(", ")}
              </p>
            ) : null}
            <p className="text-xs text-muted">
              Cadastro em {formatDateTimeBR(customer.createdAt)}
            </p>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h2 className="font-semibold mb-3">Endereços</h2>
            {customer.addresses.length === 0 ? (
              <p className="text-sm text-muted">Nenhum endereço cadastrado.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {customer.addresses.map((a) => (
                  <li key={a.id} className="border border-line p-3">
                    <div className="text-xs text-muted mb-1">
                      {a.label}
                      {a.isDefault ? " · padrão" : ""}
                    </div>
                    <p>
                      {a.street}, {a.number}
                      {a.complement ? ` ${a.complement}` : ""}
                    </p>
                    <p>
                      {a.neighborhood} — {a.city}/{a.state}
                    </p>
                    <p>CEP {a.zipCode}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="space-y-6">
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
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="text-rose-dark underline-offset-2 hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                  <span>
                    {formatBRL(Number(o.total))} · {o.status}
                  </span>
                </li>
              ))}
              {customer.orders.length === 0 && (
                <li className="text-muted">Nenhum pedido.</li>
              )}
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
    </div>
  );
}
