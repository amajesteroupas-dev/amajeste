import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ReviewStatusForm } from "@/components/admin/ReviewStatusForm";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const filter = (sp.status || "PENDING").toUpperCase();
  const statusFilter =
    filter === "ALL" || !["PENDING", "APPROVED", "REJECTED"].includes(filter)
      ? undefined
      : (filter as "PENDING" | "APPROVED" | "REJECTED");

  const [reviews, pendingCount] = await Promise.all([
    prisma.productReview.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        customer: { select: { name: true, email: true } },
        product: { select: { name: true, slug: true } },
      },
    }),
    prisma.productReview.count({ where: { status: "PENDING" } }),
  ]);

  const tabs = [
    { key: "PENDING", label: `Pendentes (${pendingCount})` },
    { key: "APPROVED", label: "Aprovadas" },
    { key: "REJECTED", label: "Rejeitadas" },
    { key: "ALL", label: "Todas" },
  ];

  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Avaliações
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Comentários e notas dos clientes só aparecem na loja depois que você
        aprovar. Rejeite o que não fizer sentido para a marca.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const active = (sp.status || "PENDING").toUpperCase() === t.key;
          return (
            <Link
              key={t.key}
              href={
                t.key === "PENDING"
                  ? "/admin/avaliacoes"
                  : `/admin/avaliacoes?status=${t.key}`
              }
              className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${
                active
                  ? "bg-ink text-white border-ink"
                  : "bg-white border-line text-ink hover:border-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Cliente</th>
              <th>Nota</th>
              <th>Comentário</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted text-sm py-8 text-center">
                  Nenhuma avaliação neste filtro.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">
                    {r.createdAt.toLocaleDateString("pt-BR")}
                  </td>
                  <td>
                    <Link
                      href={`/produto/${r.product.slug}`}
                      className="hover:underline font-medium"
                      target="_blank"
                    >
                      {r.product.name}
                    </Link>
                  </td>
                  <td>
                    <div className="font-medium">{r.customer.name}</div>
                    <div className="text-xs text-muted">{r.customer.email}</div>
                  </td>
                  <td>
                    {"★".repeat(r.rating)}
                    <span className="text-muted">
                      {"★".repeat(5 - r.rating)}
                    </span>
                  </td>
                  <td className="max-w-sm">
                    {r.title ? (
                      <div className="font-medium text-sm">{r.title}</div>
                    ) : null}
                    <div className="text-xs text-muted line-clamp-3 whitespace-pre-line">
                      {r.body}
                    </div>
                  </td>
                  <td>
                    <span className="badge">
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                  </td>
                  <td>
                    <ReviewStatusForm id={r.id} status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
