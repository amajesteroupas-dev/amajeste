import { prisma } from "@/lib/prisma";
import { startOfDay, startOfMonth, subDays } from "date-fns";
import { TrafficPanelClient } from "@/components/admin/TrafficPanelClient";
import {
  computeTrafficHealth,
  normalizeTrafficPlatform,
  platformLabel,
} from "@/lib/traffic-attribution";
import { getTrafficIntegrationsPublic } from "@/lib/traffic-ads-settings";
import {
  buildOfferCopy,
  buildOrganicWeek,
  buildTodayTasks,
  buildUtmLinks,
  computeFunnel,
  computePreAdScore,
  getDayChecklist,
  getSalesOffer,
  listOfferProductOptions,
} from "@/lib/sales-hub";

export const dynamic = "force-dynamic";

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function AdminTrafficPage() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));
  const monthStart = startOfMonth(now);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://amajeste.com.br";

  const [
    visitsToday,
    visitsWeek,
    uniqueIpsToday,
    uniqueIpsWeek,
    uniqueIpsMonth,
    deviceToday,
    productViews,
    salesMonth,
    campaigns,
    paidWeek,
    paidMonth,
    paidMonthOrders,
    productPageHitsWeek,
    integrations,
    offer,
    offerProducts,
    checklist,
    pendingOrders,
    openComplaints,
  ] = await Promise.all([
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
      where: { createdAt: { gte: monthStart } },
      distinct: ["ipHash"],
      select: { ipHash: true },
    }),
    prisma.siteVisit.groupBy({
      by: ["deviceType"],
      where: { createdAt: { gte: dayStart } },
      _count: { _all: true },
    }),
    prisma.product.aggregate({
      where: { deletedAt: null },
      _sum: { viewCount: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [...PAID] },
        createdAt: { gte: monthStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.trafficCampaign.findMany({
      orderBy: [{ active: "desc" }, { startedAt: "desc" }],
      take: 100,
    }),
    prisma.order.findMany({
      where: {
        status: { in: [...PAID] },
        createdAt: { gte: weekStart },
      },
      select: {
        total: true,
        utmSource: true,
        utmCampaign: true,
        attributionSyncedAt: true,
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: [...PAID] },
        createdAt: { gte: monthStart },
      },
      select: { total: true, utmSource: true, utmCampaign: true },
    }),
    prisma.order.aggregate({
      where: {
        status: { in: [...PAID] },
        createdAt: { gte: monthStart },
      },
      _sum: { total: true },
      _count: true,
    }),
    prisma.siteVisit.count({
      where: {
        createdAt: { gte: weekStart },
        path: { startsWith: "/produto" },
      },
    }),
    getTrafficIntegrationsPublic(),
    getSalesOffer(),
    listOfferProductOptions(50),
    getDayChecklist(),
    prisma.order.count({
      where: { status: { in: ["PENDING", "PAID", "PROCESSING"] } },
    }),
    prisma.complaint.count({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
    }),
  ]);

  const mobileToday =
    deviceToday.find((d) => d.deviceType === "mobile")?._count._all || 0;
  const desktopToday =
    deviceToday.find((d) => d.deviceType === "desktop")?._count._all || 0;

  function groupBySource(
    orders: { total: unknown; utmSource: string | null }[]
  ) {
    const map = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const key = normalizeTrafficPlatform(o.utmSource);
      const cur = map.get(key) || { orders: 0, revenue: 0 };
      cur.orders += 1;
      cur.revenue += Number(o.total) || 0;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([source, v]) => ({
        source,
        label: platformLabel(source),
        orders: v.orders,
        revenue: v.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  const bySourceWeek = groupBySource(paidWeek);
  const bySourceMonth = groupBySource(paidMonth);
  const attributedWeek = paidWeek.filter((o) => o.utmSource);
  const attributedOrdersWeek = attributedWeek.length;
  const attributedRevenueWeek = attributedWeek.reduce(
    (s, o) => s + (Number(o.total) || 0),
    0
  );
  const attributedMonth = paidMonth.filter((o) => o.utmSource);

  const campaignSpend = campaigns.reduce((s, c) => s + Number(c.spend || 0), 0);
  const campaignRevenue = campaigns.reduce(
    (s, c) => s + Number(c.revenue || 0),
    0
  );
  const campaignRoas = campaignSpend > 0 ? campaignRevenue / campaignSpend : 0;

  const health = computeTrafficHealth({
    visitsWeek,
    attributedOrdersWeek,
    attributedRevenueWeek,
    campaignSpend,
    campaignRoas,
  });

  const offerProduct =
    offerProducts.find((p) => p.id === offer.productId) || null;

  const links = buildUtmLinks({
    siteUrl,
    productSlug: offerProduct?.slug || null,
    campaignSlug: offer.campaignSlug,
  });
  const texts = buildOfferCopy({
    productName: offerProduct?.name || offer.headline || "peça Majesté",
    price: offerProduct?.price || 0,
    headline: offer.headline,
    siteUrl,
  });
  const offerCopy = { ...texts, links };

  const funnelWeek = computeFunnel({
    uniqueVisitors: uniqueIpsWeek.length,
    productPageViews: productPageHitsWeek || productViews._sum.viewCount || 0,
    paidOrders: paidWeek.length,
    attributedOrders: attributedWeek.length,
    revenue: paidWeek.reduce((s, o) => s + (Number(o.total) || 0), 0),
    campaignSpend,
  });

  const funnelMonth = computeFunnel({
    uniqueVisitors: uniqueIpsMonth.length,
    productPageViews: productViews._sum.viewCount || 0,
    paidOrders: paidMonthOrders._count || paidMonth.length,
    attributedOrders: attributedMonth.length,
    revenue: Number(paidMonthOrders._sum.total || 0),
    campaignSpend,
  });

  const preScore = computePreAdScore({
    integrations,
    offer,
    product: offerProduct,
    campaignSpend,
    pendingOrders,
    openComplaints,
    health,
  });

  const organicWeek = buildOrganicWeek({
    productName: offerProduct?.name || "sua oferta",
    productSlug: offerProduct?.slug || null,
    siteUrl,
    metaLink: links[0]?.url || siteUrl,
  });

  const todayTasks = buildTodayTasks({
    productName: offerProduct?.name || null,
    preReady: preScore.ready,
    health,
    pendingOrders,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          Central de Vendas
        </h1>
        <p className="text-sm text-[#6b5f56] mt-1 max-w-2xl">
          O que fazer hoje, oferta da semana, funil, orgânico e anúncio — em um
          só lugar, para vender mais com clareza.
        </p>
      </div>
      <TrafficPanelClient
        stats={{
          visitsToday,
          visitsWeek,
          uniqueIpsToday: uniqueIpsToday.length,
          uniqueIpsWeek: uniqueIpsWeek.length,
          mobileToday,
          desktopToday,
          productViews: productViews._sum.viewCount || 0,
          salesMonth: Number(salesMonth._sum.total || 0),
          ordersMonth: salesMonth._count || 0,
          attributedOrdersWeek,
          attributedRevenueWeek,
        }}
        bySourceWeek={bySourceWeek}
        bySourceMonth={bySourceMonth}
        health={health}
        siteUrl={siteUrl}
        integrations={integrations}
        hub={{
          todayTasks,
          checklist,
          funnelWeek,
          funnelMonth,
          offer,
          offerProducts,
          offerProduct,
          offerCopy,
          organicWeek,
          preScore,
        }}
        campaigns={campaigns.map((c) => ({
          ...c,
          spend: Number(c.spend),
          revenue: Number(c.revenue),
          startedAt: c.startedAt.toISOString(),
          endedAt: c.endedAt ? c.endedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
