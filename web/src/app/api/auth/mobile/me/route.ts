import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";
import { requireCustomer } from "@/lib/customer";

/** Sessão atual (Bearer ou cookie NextAuth). */
export async function GET() {
  const mobile = await getMobileAuthUser();
  if (mobile) {
    const customer = await requireCustomer();
    if (!customer) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      auth: "bearer",
      user: {
        id: mobile.sub,
        email: mobile.email,
        name: mobile.name,
        role: mobile.role,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
      },
    });
  }

  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const user = customer.userId
    ? await prisma.user.findUnique({
        where: { id: customer.userId },
        select: { id: true, email: true, name: true, role: true },
      })
    : null;

  return NextResponse.json({
    ok: true,
    auth: "session",
    user,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      avatarUrl: customer.avatarUrl,
    },
  });
}
