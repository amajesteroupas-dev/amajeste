import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LookStatusForm } from "@/components/admin/LookStatusForm";
import { formatConsentDate } from "@/lib/look-image-consent";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
};

export default async function AdminLooksPage({
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

  const [looks, pendingCount, approvedCount, coupons] = await Promise.all([
    prisma.lookPost.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        customer: { select: { name: true, email: true } },
        coupon: true,
      },
    }),
    prisma.lookPost.count({ where: { status: "PENDING" } }),
    prisma.lookPost.count({ where: { status: "APPROVED" } }),
    prisma.discountCoupon.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        customer: { select: { name: true, email: true } },
        lookPost: { select: { id: true, imageUrl: true } },
      },
    }),
  ]);

  const tabs = [
    { key: "PENDING", label: `Pendentes (${pendingCount})` },
    { key: "APPROVED", label: `Aprovados (${approvedCount})` },
    { key: "REJECTED", label: "Rejeitados" },
    { key: "ALL", label: "Todos" },
  ];

  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Looks & cupons
      </h1>
      <p className="text-sm text-muted mb-2 max-w-2xl">
        Aprove os looks das clientes. Ao escolher{" "}
        <strong>Aprovar (publicar na galeria)</strong>, o look entra em{" "}
        <Link href="/looks" className="underline" target="_blank">
          /looks
        </Link>{" "}
        e o sistema gera um cupom único de 10% (não acumula com o 5% do Pix).
      </p>
      <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 mb-6 max-w-2xl">
        <strong>Consentimento Aceito</strong> só confirma que a cliente autorizou
        o uso da foto — <strong>não publica</strong>. Para aparecer na Galeria
        Majesté, o status precisa ser <strong>Aprovado</strong>.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((t) => {
          const active = (sp.status || "PENDING").toUpperCase() === t.key;
          return (
            <Link
              key={t.key}
              href={
                t.key === "PENDING"
                  ? "/admin/looks"
                  : `/admin/looks?status=${t.key}`
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

      <div className="border border-line bg-surface overflow-x-auto mb-10">
        <table className="table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Cliente</th>
              <th>Peça / legenda</th>
              <th>Consentimento</th>
              <th>Cupom</th>
              <th>Status</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {looks.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted text-sm py-8 text-center">
                  Nenhum look neste filtro.
                </td>
              </tr>
            ) : (
              looks.map((l) => (
                <tr key={l.id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={l.imageUrl}
                      alt=""
                      className="h-16 w-12 object-cover bg-[#ece6df]"
                    />
                  </td>
                  <td>
                    <div className="font-medium">{l.customer.name}</div>
                    <div className="text-xs text-muted">{l.customer.email}</div>
                    <div className="text-[11px] text-muted">
                      {l.createdAt.toLocaleDateString("pt-BR")}
                    </div>
                  </td>
                  <td className="max-w-xs">
                    {l.productName ? (
                      <div className="font-medium text-sm">{l.productName}</div>
                    ) : null}
                    <div className="text-xs text-muted line-clamp-2">
                      {l.caption || "—"}
                    </div>
                  </td>
                  <td>
                    {l.imageConsentAcceptedAt ? (
                      <div>
                        <span className="badge bg-emerald-50 text-emerald-900 border border-emerald-200">
                          Aceito
                        </span>
                        <div className="text-[11px] text-muted mt-1">
                          {formatConsentDate(l.imageConsentAcceptedAt)}
                          {l.imageConsentVersion
                            ? ` · ${l.imageConsentVersion}`
                            : ""}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-800">Sem registro</span>
                    )}
                  </td>
                  <td>
                    {l.rewardCode || l.coupon?.code ? (
                      <div>
                        <code className="text-sm font-semibold">
                          {l.rewardCode || l.coupon?.code}
                        </code>
                        <div className="text-[11px] text-muted">
                          −{l.rewardPercent}%
                          {l.coupon?.used || l.rewardUsed
                            ? " · usado"
                            : " · disponível"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">
                        Gera ao aprovar
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        l.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                          : l.status === "REJECTED"
                            ? "bg-rose-50 text-rose-900 border border-rose-200"
                            : ""
                      }`}
                    >
                      {STATUS_LABEL[l.status] || l.status}
                    </span>
                    {l.status === "APPROVED" ? (
                      <div className="text-[11px] text-emerald-800 mt-1">
                        Visível em /looks
                      </div>
                    ) : null}
                  </td>
                  <td>
                    <LookStatusForm id={l.id} status={l.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h2
        className="text-2xl mb-3"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Cupons gerados
      </h2>
      <div className="border border-line bg-surface overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>%</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Criado</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted text-sm py-6 text-center">
                  Nenhum cupom ainda. Aprove um look para gerar.
                </td>
              </tr>
            ) : (
              coupons.map((c) => (
                <tr key={c.id}>
                  <td>
                    <code className="font-semibold">{c.code}</code>
                  </td>
                  <td>−{c.percent}%</td>
                  <td>
                    {c.customer ? (
                      <>
                        <div className="font-medium">{c.customer.name}</div>
                        <div className="text-xs text-muted">
                          {c.customer.email}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{c.used ? "Usado" : "Disponível"}</td>
                  <td>{c.createdAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
