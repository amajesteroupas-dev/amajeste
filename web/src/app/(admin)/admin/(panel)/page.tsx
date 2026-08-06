import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/utils";
import { startOfDay, startOfMonth, subDays } from "date-fns";
import { parseCutoutLayers } from "@/lib/cutout-layout";
import { AdminWelcomeBanner } from "@/components/admin/AdminWelcomeBanner";
import type { StoreBanner } from "@/components/store/BannerCarousel";
import Link from "next/link";
import { expireStaleStockReservations } from "@/lib/order-stock-reserve";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const monthStart = startOfMonth(now);
  const weekStart = startOfDay(subDays(now, 6));

  // Libera reservas vencidas ao abrir o painel
  void expireStaleStockReservations(40);

  const [
    salesToday,
    salesMonth,
    ordersPending,
    lowStock,
    openComplaints,
    recentOrders,
    banners,
    topViewed,
    totalViews,
    siteVisitsToday,
    siteVisitsWeek,
    uniqueIpsToday,
    uniqueIpsWeek,
    uniqueIpsTotal,
    deviceToday,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        createdAt: { gte: dayStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.aggregate({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        createdAt: { gte: monthStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({
      where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } },
    }),
    prisma.productVariant.findMany({
      where: {
        active: true,
        stock: { lte: 3 },
        product: { deletedAt: null },
      },
      include: { product: true },
      take: 8,
      orderBy: { stock: "asc" },
    }),
    prisma.complaint.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.banner.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    prisma.product.findMany({
      where: { deletedAt: null, viewCount: { gt: 0 } },
      orderBy: { viewCount: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        viewCount: true,
        active: true,
      },
    }),
    prisma.product.aggregate({
      where: { deletedAt: null },
      _sum: { viewCount: true },
    }),
    prisma.siteVisit.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.siteVisit.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: dayStart } },
      distinct: ["ipHash"],
      select: { ipHash: true },
    }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: weekStart } },
      distinct: ["ipHash"],
      select: { ipHash: true },
    }),
    prisma.siteVisit.findMany({
      distinct: ["ipHash"],
      select: { ipHash: true },
    }),
    prisma.siteVisit.groupBy({
      by: ["deviceType"],
      where: { createdAt: { gte: dayStart } },
      _count: { _all: true },
    }),
  ]);

  const monthTotal = Number(salesMonth._sum.total || 0);
  const monthCount = salesMonth._count || 0;
  const avgTicket = monthCount ? monthTotal / monthCount : 0;

  const deviceMap = Object.fromEntries(
    deviceToday.map((d) => [d.deviceType, d._count._all])
  );
  const mobileHits = (deviceMap.mobile || 0) + (deviceMap.tablet || 0);
  const desktopHits = deviceMap.desktop || 0;
  const deviceTotal = mobileHits + desktopHits + (deviceMap.unknown || 0);

  const storeBanners: StoreBanner[] = banners.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    ctaLabel: b.ctaLabel,
    ctaHref: b.ctaHref,
    imageUrl: b.imageUrl,
    textAlign: b.textAlign,
    overlay: b.overlay,
    layout: b.layout,
    bgColor: b.bgColor,
    panelColor: b.panelColor,
    highlight: b.highlight,
    promoText: b.promoText,
    couponCode: b.couponCode,
    tagline: b.tagline,
    bannerSize: b.bannerSize,
    imageFit: b.imageFit,
    focalX: b.focalX,
    focalY: b.focalY,
    imageZoom: b.imageZoom,
    textStyle: b.textStyle as StoreBanner["textStyle"],
    cutoutImages: parseCutoutLayers(b.cutoutImages),
  }));

  return (
    <div>
      <AdminWelcomeBanner
        banners={storeBanners}
        adminName="Josy Santos"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
        <Stat
          label="Vendas hoje"
          value={formatBRL(Number(salesToday._sum.total || 0))}
          sub={`${salesToday._count} pedidos`}
        />
        <Stat
          label="Vendas no mês"
          value={formatBRL(monthTotal)}
          sub={`${monthCount} pedidos`}
        />
        <Stat label="Ticket médio" value={formatBRL(avgTicket)} sub="mês atual" />
        <Stat
          label="Pendências"
          value={String(ordersPending)}
          sub={`${openComplaints} reclamações abertas`}
        />
        <Stat
          label="Visitas nos produtos"
          value={String(totalViews._sum.viewCount || 0)}
          sub={`${topViewed.length} com tráfego`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Stat
          label="Visitas do site (hoje)"
          value={String(siteVisitsToday)}
          sub={`${uniqueIpsToday.length} IP(s) diferentes`}
        />
        <Stat
          label="Visitantes (7 dias)"
          value={String(uniqueIpsWeek.length)}
          sub={`${siteVisitsWeek} pageviews · ${uniqueIpsTotal.length} IPs no total`}
        />
        <Stat
          label="Mobile hoje"
          value={String(mobileHits)}
          sub={
            deviceTotal
              ? `${Math.round((mobileHits / deviceTotal) * 100)}% dos acessos`
              : "celular / tablet"
          }
        />
        <Stat
          label="Computador hoje"
          value={String(desktopHits)}
          sub={
            deviceTotal
              ? `${Math.round((desktopHits / deviceTotal) * 100)}% dos acessos`
              : "desktop"
          }
        />
      </div>
      <p className="text-xs text-muted -mt-6 mb-8">
        Controle de zerar métricas:{" "}
        <Link href="/admin/lancamento" className="text-rose-dark underline">
          Sistema → Controle de lançamento
        </Link>
      </p>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <section className="admin-panel-card border border-black/10 bg-white p-5">
          <h2 className="font-semibold mb-4 text-[#1a1a1a]">
            Produtos mais visitados
          </h2>
          <table className="table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Visitas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topViewed.map((p) => (
                <tr key={p.id}>
                  <td>
                    <a
                      href={`/admin/produtos/${p.id}`}
                      className="text-rose-dark"
                    >
                      {p.name}
                    </a>
                    {!p.active && (
                      <span className="ml-2 text-[10px] uppercase text-[#6b5f56]">
                        inativo
                      </span>
                    )}
                  </td>
                  <td className="tabular-nums font-medium">
                    {p.viewCount.toLocaleString("pt-BR")}
                  </td>
                  <td>
                    <a
                      href={`/produto/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#6b5f56] underline"
                    >
                      Ver
                    </a>
                  </td>
                </tr>
              ))}
              {topViewed.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted">
                    Ainda sem visitas registradas. Abra produtos na loja para
                    começar a contar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="admin-panel-card border border-black/10 bg-white p-5">
          <h2 className="font-semibold mb-4 text-[#1a1a1a]">Estoque baixo</h2>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <section className="admin-panel-card border border-black/10 bg-white p-5">
          <h2 className="font-semibold mb-4 text-[#1a1a1a]">Pedidos recentes</h2>
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
    <div className="admin-panel-card border border-black/10 bg-white p-5">
      <p className="text-xs uppercase tracking-wider text-[#666] mb-2">{label}</p>
      <p className="text-2xl font-semibold text-[#1a1a1a]">{value}</p>
      <p className="text-xs text-[#666] mt-1">{sub}</p>
    </div>
  );
}
