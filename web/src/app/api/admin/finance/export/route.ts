import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { endOfMonth, parse, startOfMonth } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const mes = req.nextUrl.searchParams.get("mes");
  let dateFilter: { gte: Date; lte: Date } | undefined;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    try {
      const start = startOfMonth(parse(`${mes}-01`, "yyyy-MM-dd", new Date()));
      dateFilter = { gte: start, lte: endOfMonth(start) };
    } catch {
      dateFilter = undefined;
    }
  }

  const [orders, expenses, cash] = await Promise.all([
    prisma.order.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      orderBy: { createdAt: "desc" },
      include: { customer: true, payment: true },
    }),
    prisma.expense.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      orderBy: { createdAt: "desc" },
    }),
    prisma.cashEntry.findMany({
      where: dateFilter ? { date: dateFilter } : undefined,
      orderBy: { date: "desc" },
    }),
  ]);

  const lines = [
    "tipo,id,data,descricao,valor,status",
    ...orders.map(
      (o) =>
        `pedido,${o.orderNumber},${o.createdAt.toISOString()},"${(o.customer?.name || o.guestName || "").replace(/"/g, '""')}",${o.total},${o.status}`
    ),
    ...expenses.map(
      (e) =>
        `despesa,${e.id},${e.createdAt.toISOString()},"${e.description.replace(/"/g, '""')}",${e.amount},${e.paid ? "PAGO" : "ABERTO"}`
    ),
    ...cash.map(
      (c) =>
        `caixa,${c.id},${c.date.toISOString()},"${c.description.replace(/"/g, '""')}",${c.amount},${c.type}`
    ),
  ];

  const filename = mes
    ? `majest-financeiro-${mes}.csv`
    : "majest-financeiro.csv";

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
