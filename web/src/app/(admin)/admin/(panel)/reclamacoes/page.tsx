import { prisma } from "@/lib/prisma";
import { ComplaintForm } from "@/components/admin/ComplaintForm";
import { ComplaintStatusForm } from "@/components/admin/ComplaintStatusForm";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  const [complaints, customers, orders, storyFeedback] = await Promise.all([
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
    prisma.storyAnswer.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        story: { select: { id: true, title: true, question: true, videoUrl: true } },
      },
      take: 100,
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Reclamações / Elogios
      </h1>
      <p className="text-sm text-muted mb-6">
        Trocas e reclamações de pedidos, além das respostas e comentários dos
        Stories.
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-medium mb-3">Respostas dos Stories</h2>
        <div className="border border-line bg-surface overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Story / pergunta</th>
                <th>Resposta / comentário</th>
              </tr>
            </thead>
            <tbody>
              {storyFeedback.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted text-sm">
                    Ainda não há respostas dos stories.
                  </td>
                </tr>
              ) : (
                storyFeedback.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap">
                      {a.createdAt.toLocaleString("pt-BR")}
                    </td>
                    <td>
                      <span className="badge">
                        {a.kind === "comment" ? "Comentário / elogio" : "Enquete"}
                      </span>
                    </td>
                    <td>
                      <div className="font-medium">
                        {a.story.title || "Story"}
                      </div>
                      {a.kind === "poll" && a.story.question ? (
                        <div className="text-xs text-muted max-w-xs">
                          {a.story.question}
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-md whitespace-pre-wrap text-sm">
                      {a.answer}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium mb-3">Reclamações / Trocas</h2>
        <ComplaintForm
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))}
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
                    <div className="text-xs text-muted max-w-xs truncate">
                      {c.description}
                    </div>
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
      </section>
    </div>
  );
}
