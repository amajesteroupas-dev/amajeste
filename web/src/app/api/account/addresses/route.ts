import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { digitsOnlyCep } from "@/lib/cep";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: [{ isDefault: "desc" }, { label: "asc" }],
  });
  return NextResponse.json(addresses);
}

export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const zipCode = digitsOnlyCep(String(body.zipCode || ""));
  if (zipCode.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
  }

  const street = String(body.street || "").trim();
  const number = String(body.number || "").trim();
  const neighborhood = String(body.neighborhood || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").toUpperCase().slice(0, 2);
  if (!street || !number || !neighborhood || !city || state.length !== 2) {
    return NextResponse.json(
      { error: "Preencha rua, número, bairro, cidade e UF" },
      { status: 400 }
    );
  }

  const count = await prisma.address.count({
    where: { customerId: customer.id },
  });
  const isDefault = body.isDefault === true || count === 0;

  if (isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: String(body.label || "Entrega").trim() || "Entrega",
      street,
      number,
      complement: body.complement ? String(body.complement) : null,
      neighborhood,
      city,
      state,
      zipCode,
      isDefault,
    },
  });

  return NextResponse.json(address);
}

export async function PATCH(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const existing = await prisma.address.findFirst({
    where: { id, customerId: customer.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Endereço não encontrado" }, { status: 404 });
  }

  if (body.setDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id },
      data: { isDefault: false },
    });
    const updated = await prisma.address.update({
      where: { id },
      data: { isDefault: true },
    });
    return NextResponse.json(updated);
  }

  const data: Record<string, unknown> = {};
  if (body.label !== undefined) data.label = String(body.label);
  if (body.street !== undefined) data.street = String(body.street);
  if (body.number !== undefined) data.number = String(body.number);
  if (body.complement !== undefined)
    data.complement = body.complement ? String(body.complement) : null;
  if (body.neighborhood !== undefined)
    data.neighborhood = String(body.neighborhood);
  if (body.city !== undefined) data.city = String(body.city);
  if (body.state !== undefined)
    data.state = String(body.state).toUpperCase().slice(0, 2);
  if (body.zipCode !== undefined)
    data.zipCode = digitsOnlyCep(String(body.zipCode));

  const updated = await prisma.address.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }

  const existing = await prisma.address.findFirst({
    where: { id, customerId: customer.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({
      where: { customerId: customer.id },
      orderBy: { label: "asc" },
    });
    if (next) {
      await prisma.address.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
