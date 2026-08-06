import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDateTimeBR } from "@/lib/utils";
import { MarkAlertNotifiedButton } from "@/components/admin/MarkAlertNotifiedButton";

export const dynamic = "force-dynamic";

export default async function StockAlertsAdminPage() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    redirect("/admin/login");
  }

  const alerts = await prisma.stockAlert.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      product: { select: { name: true, slug: true } },
      variant: { select: { size: true, color: true, stock: true } },
    },
  });

  const pending = alerts.filter((a) => !a.notified).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#2a2420]">
          Avise-me quando chegar
        </h1>
        <p className="text-sm text-[#6b5f56] mt-1">
          {pending} aguardando · {alerts.length} no total (últimos 200)
        </p>
      </div>

      <div className="overflow-x-auto bg-white border border-[#e5dfd6]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e5dfd6] text-left text-xs uppercase tracking-wider text-[#6b5f56]">
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Produto</th>
              <th className="px-3 py-3">Tamanho / Cor</th>
              <th className="px-3 py-3">Contato</th>
              <th className="px-3 py-3">Estoque</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {alerts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-[#6b5f56]">
                  Nenhum aviso cadastrado ainda.
                </td>
              </tr>
            )}
            {alerts.map((a) => (
              <tr key={a.id} className="border-b border-[#f0ebe4]">
                <td className="px-3 py-3 whitespace-nowrap text-[#6b5f56]">
                  {formatDateTimeBR(a.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <a
                    href={`/produto/${a.product.slug}`}
                    className="underline underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {a.product.name}
                  </a>
                </td>
                <td className="px-3 py-3">
                  {[a.size || a.variant?.size, a.color || a.variant?.color]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-3 py-3">
                  <div>{a.email}</div>
                  {a.phone && (
                    <div className="text-xs text-[#6b5f56]">{a.phone}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {a.variant ? `${a.variant.stock} un.` : "—"}
                </td>
                <td className="px-3 py-3">
                  {a.notified ? (
                    <span className="text-xs uppercase tracking-wider text-emerald-700">
                      Avisado
                    </span>
                  ) : (
                    <span className="text-xs uppercase tracking-wider text-amber-700">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {!a.notified && <MarkAlertNotifiedButton id={a.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
