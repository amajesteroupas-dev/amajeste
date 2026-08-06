import { prisma } from "@/lib/prisma";
import {
  effectiveUnitCost,
  roundMoney,
} from "@/lib/inventory-cost";
import {
  getFinanceOpsSettings,
  maskSecret,
  packagingUnitCost,
  taxOnSalePrice,
  unitEconomics,
} from "@/lib/finance-settings";
import { getLivePromotions } from "@/lib/promotion-settings";
import {
  estimatePaymentFeeAmount,
  getActiveGateway,
  monthlyFixedTotal,
  monthlyMarketingTotal,
  salesChannelLabel,
  settlementLabel,
  type SalesChannelReport,
  type SalesPaymentChannel,
} from "@/lib/finance-margin";
import {
  addMonths,
  endOfMonth,
  format,
  parse,
  startOfMonth,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { FinanceDashboard } from "@/components/admin/FinanceDashboard";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ mes?: string }>;
};

function parseMonthParam(raw?: string) {
  const now = new Date();
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) {
    return startOfMonth(now);
  }
  try {
    const d = parse(`${raw}-01`, "yyyy-MM-dd", now);
    if (Number.isNaN(d.getTime())) return startOfMonth(now);
    return startOfMonth(d);
  } catch {
    return startOfMonth(now);
  }
}

function buildMonthOptions(selected: Date) {
  const now = startOfMonth(new Date());
  const options: { value: string; label: string }[] = [];
  for (let i = 24; i >= -1; i--) {
    const d = addMonths(now, -i);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: ptBR }),
    });
  }
  const sel = format(selected, "yyyy-MM");
  if (!options.some((o) => o.value === sel)) {
    options.unshift({
      value: sel,
      label: format(selected, "MMMM yyyy", { locale: ptBR }),
    });
  }
  return options.map((o) => ({
    ...o,
    label: o.label.charAt(0).toUpperCase() + o.label.slice(1),
  }));
}

export default async function FinancePage({ searchParams }: Props) {
  const sp = await searchParams;
  const monthStart = parseMonthParam(sp.mes);
  const monthEnd = endOfMonth(monthStart);
  const monthKey = format(monthStart, "yyyy-MM");
  const monthLabel = format(monthStart, "MMMM yyyy", { locale: ptBR });
  const monthLabelCap =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const monthRange = { gte: monthStart, lte: monthEnd };
  const [fin, livePromotions] = await Promise.all([
    getFinanceOpsSettings(),
    getLivePromotions(),
  ]);
  const packUnit = packagingUnitCost(fin.costs);

  const [
    income,
    expenses,
    cashEntries,
    unpaidExpenses,
    paidOrders,
    variants,
    purchaseMovements,
    productPurchasesCash,
    saleVariants,
    recentOrders,
  ] = await Promise.all([
    prisma.cashEntry.aggregate({
      where: { type: "INCOME", date: monthRange },
      _sum: { amount: true },
    }),
    prisma.cashEntry.aggregate({
      where: { type: "EXPENSE", date: monthRange },
      _sum: { amount: true },
    }),
    prisma.cashEntry.findMany({
      where: { date: monthRange },
      orderBy: { date: "desc" },
      take: 80,
    }),
    prisma.expense.findMany({
      where: { paid: false },
      orderBy: { dueDate: "asc" },
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        createdAt: monthRange,
      },
      include: {
        payment: { select: { method: true, amount: true, status: true } },
        items: { include: { variant: { include: { product: true } } } },
      },
    }),
    prisma.productVariant.findMany({
      where: { active: true, stock: { gt: 0 } },
      include: { product: { select: { costPrice: true, name: true, price: true } } },
    }),
    prisma.inventoryMovement.findMany({
      where: {
        type: "IN",
        OR: [
          { purchaseDate: monthRange },
          { purchaseDate: null, createdAt: monthRange },
        ],
      },
      select: { totalCost: true, quantity: true, unitCost: true },
    }),
    prisma.cashEntry.aggregate({
      where: {
        type: "EXPENSE",
        category: "Compra de mercadoria",
        date: monthRange,
      },
      _sum: { amount: true },
    }),
    prisma.productVariant.findMany({
      where: {
        active: true,
        product: { active: true, deletedAt: null },
      },
      include: {
        product: { select: { name: true, price: true, costPrice: true } },
      },
      orderBy: [{ product: { name: "asc" } }, { size: "asc" }, { color: "asc" }],
      take: 500,
    }),
    prisma.order.findMany({
      where: {
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        orderNumber: true,
        guestName: true,
        total: true,
        createdAt: true,
        nfeStatus: true,
        printStatus: true,
      },
    }),
  ]);

  let cogsMerch = 0;
  let cogsPackaging = 0;
  let taxMonth = 0;
  let salesRevenueOrders = 0;
  const byProduct = new Map<
    string,
    {
      productName: string;
      qty: number;
      revenue: number;
      merchandise: number;
      packaging: number;
      tax: number;
    }
  >();

  type ChannelAcc = {
    orders: number;
    sales: number;
    feeAmount: number;
    feePercentSum: number;
    cogs: number;
    tax: number;
  };
  const byChannel: Record<SalesPaymentChannel, ChannelAcc> = {
    pix: { orders: 0, sales: 0, feeAmount: 0, feePercentSum: 0, cogs: 0, tax: 0 },
    card: { orders: 0, sales: 0, feeAmount: 0, feePercentSum: 0, cogs: 0, tax: 0 },
    other: { orders: 0, sales: 0, feeAmount: 0, feePercentSum: 0, cogs: 0, tax: 0 },
  };

  const gateway = getActiveGateway(fin.margin);
  const feeSettlement = fin.margin.promoPreferInstant ? "instant" : "d30";

  for (const order of paidOrders) {
    const orderTotal = Number(order.total);
    salesRevenueOrders += orderTotal;

    let orderCogs = 0;
    let orderTax = 0;

    for (const item of order.items) {
      const merch =
        Number(item.unitCost) > 0
          ? Number(item.unitCost)
          : effectiveUnitCost(
              item.variant.avgCost,
              item.variant.product.costPrice
            );
      const packaging =
        Number(item.unitPackaging) > 0
          ? Number(item.unitPackaging)
          : packUnit;
      const tax =
        Number(item.unitTax) > 0
          ? Number(item.unitTax)
          : taxOnSalePrice(Number(item.unitPrice), fin.costs.taxPercent);

      const lineMerch = merch * item.quantity;
      const linePack = packaging * item.quantity;
      const lineTax = tax * item.quantity;
      cogsMerch += lineMerch;
      cogsPackaging += linePack;
      taxMonth += lineTax;
      orderCogs += lineMerch + linePack;
      orderTax += lineTax;

      const key = item.productName;
      const row = byProduct.get(key) || {
        productName: key,
        qty: 0,
        revenue: 0,
        merchandise: 0,
        packaging: 0,
        tax: 0,
      };
      row.qty += item.quantity;
      row.revenue += Number(item.total);
      row.merchandise += lineMerch;
      row.packaging += linePack;
      row.tax += lineTax;
      byProduct.set(key, row);
    }

    const feeEst = estimatePaymentFeeAmount({
      gateway,
      method: order.payment?.method,
      amount: orderTotal,
      settlement: feeSettlement,
      installments: 1,
    });
    const channel = feeEst.channel;
    const acc = byChannel[channel];
    acc.orders += 1;
    acc.sales += orderTotal;
    acc.feeAmount += feeEst.feeAmount;
    acc.feePercentSum += feeEst.feePercent;
    acc.cogs += orderCogs;
    acc.tax += orderTax;
  }

  const cogs = roundMoney(cogsMerch + cogsPackaging);
  taxMonth = roundMoney(taxMonth);

  const salesByChannel: SalesChannelReport[] = (
    ["pix", "card", "other"] as SalesPaymentChannel[]
  )
    .map((channel) => {
      const acc = byChannel[channel];
      const sales = roundMoney(acc.sales);
      const feeAmount = roundMoney(acc.feeAmount);
      const cogsCh = roundMoney(acc.cogs);
      const taxCh = roundMoney(acc.tax);
      const avgFeePct =
        acc.orders > 0 ? roundMoney(acc.feePercentSum / acc.orders) : 0;
      return {
        channel,
        label: salesChannelLabel(channel),
        orders: acc.orders,
        sales,
        feePercent: avgFeePct,
        feeAmount,
        received: roundMoney(sales - feeAmount),
        cogs: cogsCh,
        tax: taxCh,
        profit: roundMoney(sales - feeAmount - cogsCh - taxCh),
      };
    })
    .filter((r) => r.orders > 0 || r.sales > 0);

  const paymentFees = roundMoney(
    salesByChannel.reduce((s, r) => s + r.feeAmount, 0)
  );
  const salesReceived = roundMoney(salesRevenueOrders - paymentFees);
  const marketingMonth = monthlyMarketingTotal(fin.margin.marketingCosts ?? []);
  const fixedMonth = monthlyFixedTotal(fin.margin.fixedCosts ?? []);
  const lucroFinal = roundMoney(
    salesRevenueOrders -
      paymentFees -
      cogs -
      taxMonth -
      marketingMonth -
      fixedMonth
  );
  const channelProfit = roundMoney(
    salesByChannel.reduce((s, r) => s + r.profit, 0)
  );

  let inventoryValue = 0;
  let inventoryUnits = 0;
  for (const v of variants) {
    const cost = effectiveUnitCost(v.avgCost, v.product.costPrice);
    inventoryValue += v.stock * cost;
    inventoryUnits += v.stock;
  }

  const purchasesFromMovements = purchaseMovements.reduce((sum, m) => {
    if (m.totalCost != null) return sum + Number(m.totalCost);
    if (m.unitCost != null && m.quantity > 0) {
      return sum + Number(m.unitCost) * m.quantity;
    }
    return sum;
  }, 0);

  const productSpend =
    Number(productPurchasesCash._sum.amount || 0) || purchasesFromMovements;

  const revenue = Number(income._sum.amount || 0);
  const expenseTotal = Number(expenses._sum.amount || 0);
  const grossProfit = roundMoney(revenue - cogs);
  const net = roundMoney(revenue - expenseTotal);
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netAfterTax = roundMoney(grossProfit - taxMonth);
  const taxOnSalesPct =
    salesRevenueOrders > 0 ? (taxMonth / salesRevenueOrders) * 100 : 0;

  const productTaxRows = [...byProduct.values()]
    .map((r) => ({
      ...r,
      revenue: roundMoney(r.revenue),
      merchandise: roundMoney(r.merchandise),
      packaging: roundMoney(r.packaging),
      tax: roundMoney(r.tax),
      margin: roundMoney(r.revenue - r.merchandise - r.packaging - r.tax),
    }))
    .sort((a, b) => b.tax - a.tax);

  const costPreviewRows = saleVariants.slice(0, 80).map((v) => {
    const price = Number(v.price ?? v.product.price);
    const merchandise = effectiveUnitCost(v.avgCost, v.product.costPrice);
    const eco = unitEconomics({
      merchandiseCost: merchandise,
      salePrice: price,
      costs: fin.costs,
    });
    return {
      id: v.id,
      label: `${v.product.name} · ${v.size}/${v.color}`,
      stock: v.stock,
      price: eco.sale,
      merchandise: eco.merchandise,
      packaging: eco.packaging,
      tax: eco.tax,
      totalCost: eco.totalCost,
      margin: eco.margin,
      marginPct: eco.marginPct,
    };
  });

  const stockMarginRows = saleVariants
    .filter((v) => v.stock > 0)
    .map((v) => {
      const price = Number(v.price ?? v.product.price);
      const merchandise = effectiveUnitCost(v.avgCost, v.product.costPrice);
      const packaging = packagingUnitCost(fin.costs);
      return {
        id: v.id,
        label: `${v.product.name} · ${v.size}/${v.color}`,
        stock: v.stock,
        price,
        merchandise,
        packaging,
      };
    });

  return (
    <FinanceDashboard
      monthKey={monthKey}
      monthLabel={monthLabelCap}
      monthOptions={buildMonthOptions(monthStart)}
      kpis={{
        revenue,
        expenseTotal,
        grossProfit,
        net,
        margin,
        inventoryValue,
        inventoryUnits,
        productSpend,
        cogs,
        cogsPackaging: roundMoney(cogsPackaging),
        salesRevenueOrders: roundMoney(salesRevenueOrders),
        paidOrdersCount: paidOrders.length,
        taxMonth,
        taxOnSalesPct,
        netAfterTax,
        paymentFees,
        salesReceived,
        marketingMonth,
        fixedMonth,
        channelProfit,
        lucroFinal,
        feeSettlementLabel: settlementLabel(feeSettlement),
      }}
      salesByChannel={salesByChannel}
      productTaxRows={productTaxRows}
      costPreviewRows={costPreviewRows}
      stockMarginRows={stockMarginRows}
      livePromotions={livePromotions}
      unpaidExpenses={unpaidExpenses.map((e) => ({
        id: e.id,
        description: e.description,
        category: e.category,
        amount: Number(e.amount),
        dueDate: e.dueDate ? e.dueDate.toLocaleDateString("pt-BR") : null,
      }))}
      cashEntries={cashEntries.map((e) => ({
        id: e.id,
        date: e.date.toLocaleDateString("pt-BR"),
        type: e.type,
        description: e.description,
        category: e.category,
        amount: Number(e.amount),
      }))}
      recentOrders={recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        guestName: o.guestName,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
        nfeStatus: o.nfeStatus,
        printStatus: o.printStatus,
      }))}
      saleVariants={saleVariants.map((v) => ({
        id: v.id,
        productName: v.product.name,
        size: v.size,
        color: v.color,
        sku: v.sku,
        stock: v.stock,
        price: Number(v.price ?? v.product.price),
      }))}
      settings={{
        costs: fin.costs,
        margin: fin.margin,
        nfe: {
          enabled: fin.nfe.enabled,
          autoEmitOnPaid: fin.nfe.autoEmitOnPaid,
          provider: fin.nfe.provider,
          environment: fin.nfe.environment,
          companyCnpj: fin.nfe.companyCnpj,
          companyId: fin.nfe.companyId,
          hasToken: Boolean(fin.nfe.apiToken),
          tokenMasked: fin.nfe.apiToken ? maskSecret(fin.nfe.apiToken) : "",
        },
        print: {
          enabled: fin.print.enabled,
          autoOnPaid: fin.print.autoOnPaid,
          provider: fin.print.provider,
          printNodePrinterId: fin.print.printNodePrinterId,
          hasApiKey: Boolean(fin.print.printNodeApiKey),
          apiKeyMasked: fin.print.printNodeApiKey
            ? maskSecret(fin.print.printNodeApiKey)
            : "",
        },
      }}
    />
  );
}
