import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import { digitsOnly, isValidCpf } from "@/lib/cpf";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const full = await prisma.customer.findUnique({
    where: { id: customer.id },
    include: {
      addresses: { orderBy: { isDefault: "desc" } },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
      looks: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 6,
      },
    },
  });

  return NextResponse.json(full);
}

export async function PATCH(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.phone !== undefined)
    data.phone = body.phone ? String(body.phone).trim() : null;
  if (body.birthDate !== undefined) {
    data.birthDate = body.birthDate ? new Date(String(body.birthDate)) : null;
  }
  if (body.cpf !== undefined) {
    const cpf = body.cpf ? digitsOnly(String(body.cpf)) : null;
    if (cpf && !isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
    }
    if (cpf) {
      const taken = await prisma.customer.findFirst({
        where: { cpf, NOT: { id: customer.id } },
      });
      if (taken) {
        return NextResponse.json(
          { error: "CPF já cadastrado em outra conta" },
          { status: 409 }
        );
      }
    }
    data.cpf = cpf;
  }

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data,
  });

  if (data.name && customer.userId) {
    await prisma.user.update({
      where: { id: customer.userId },
      data: { name: String(data.name) },
    });
  }

  return NextResponse.json(updated);
}
