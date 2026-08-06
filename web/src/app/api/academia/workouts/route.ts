import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.workout.findMany({
    where: { customerId: customer.id },
    orderBy: { trainedAt: "desc" },
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
  if (!title) {
    return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
  }
  const item = await prisma.workout.create({
    data: {
      customerId: customer.id,
      title,
      notes: body.notes ? String(body.notes) : null,
      exercises: Array.isArray(body.exercises) ? body.exercises : [],
      trainedAt: body.trainedAt ? new Date(String(body.trainedAt)) : new Date(),
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
  await prisma.workout.deleteMany({ where: { id, customerId: customer.id } });
  return NextResponse.json({ ok: true });
}
