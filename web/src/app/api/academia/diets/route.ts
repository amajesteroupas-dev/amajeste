import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.dietPlan.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title || !content) {
    return NextResponse.json(
      { error: "Título e conteúdo obrigatórios" },
      { status: 400 }
    );
  }
  const item = await prisma.dietPlan.create({
    data: {
      customerId: customer.id,
      title,
      content,
      calories: body.calories ? Number(body.calories) : null,
      active: body.active !== false,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.dietPlan.deleteMany({ where: { id, customerId: customer.id } });
  return NextResponse.json({ ok: true });
}
