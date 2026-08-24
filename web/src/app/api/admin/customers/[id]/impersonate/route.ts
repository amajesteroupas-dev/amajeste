import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { createImpersonationToken } from "@/lib/impersonation";
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
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
    },
  });

  if (!customer) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }
  if (!customer.user || customer.user.role !== "CUSTOMER") {
    return NextResponse.json(
      {
        error:
          "Cliente sem conta na loja. Não é possível entrar como ela.",
      },
      { status: 400 }
    );
  }

  const { token } = await createImpersonationToken({
    userId: customer.user.id,
    adminId: String(session.user.id),
    customerId: customer.id,
  });

  void writeAuditLog({
    category: "customers",
    action: "update",
    summary: `Login como cliente: ${customer.email}`,
    entityType: "Customer",
    entityId: id,
    detail: { userId: customer.user.id },
    actor: actorFromSession(session),
    ip: requestIp(req),
    source: "admin",
  });

  return NextResponse.json({
    ok: true,
    token,
    customerName: customer.name,
  });
}
