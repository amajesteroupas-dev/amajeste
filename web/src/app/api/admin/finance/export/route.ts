import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [orders, expenses, cash] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true, payment: true },
    }),
    prisma.expense.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.cashEntry.findMany({ orderBy: { date: "desc" } }),
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

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="majest-financeiro.csv"',
    },
  });
}
