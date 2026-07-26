import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
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

  return NextResponse.json(expense);
}
