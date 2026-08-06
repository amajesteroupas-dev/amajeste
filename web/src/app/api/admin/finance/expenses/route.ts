import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      description: body.description,
      amount: body.amount,
      category: body.category || "Geral",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      paid: Boolean(body.paid),
      paidAt: body.paid ? new Date() : null,
    },
  });

  if (body.paid) {
    await prisma.cashEntry.create({
      data: {
        type: "EXPENSE",
        amount: body.amount,
        description: body.description,
        category: body.category || "Geral",
        expenseId: expense.id,
      },
    });
  }

  void writeAuditLog({
    category: "finance",
    action: "launch",
    summary: `Despesa lançada: ${expense.description} (R$ ${Number(expense.amount).toFixed(2)})`,
    entityType: "Expense",
    entityId: expense.id,
    detail: {
      amount: expense.amount,
      category: expense.category,
      paid: expense.paid,
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(expense);
}
