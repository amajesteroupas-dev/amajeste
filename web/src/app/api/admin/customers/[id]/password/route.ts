import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const password = String(body.password || "");
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Senha deve ter no mínimo 6 caracteres" },
      { status: 400 }
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!customer.user || customer.user.role !== "CUSTOMER") {
    return NextResponse.json(
      {
        error:
          "Este cliente não tem conta de login na loja. Peça para ela se cadastrar.",
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: customer.user.id },
    data: { passwordHash },
  });

  void writeAuditLog({
    category: "customers",
    action: "update",
    summary: `Senha redefinida para cliente ${customer.email}`,
    entityType: "Customer",
    entityId: id,
    actor: actorFromSession(session),
    ip: requestIp(req),
    source: "admin",
  });

  return NextResponse.json({ ok: true });
}
