import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

async function requireAdmin() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const name = body.name != null ? String(body.name).trim() : undefined;
  const phone =
    body.phone != null ? String(body.phone).replace(/\D/g, "") || null : undefined;
  let cpf: string | null | undefined = undefined;
  if (body.cpf != null) {
    const raw = String(body.cpf).trim();
    if (!raw) {
      cpf = null;
    } else {
      const digits = digitsOnly(raw);
      if (!isValidCpf(digits)) {
        return NextResponse.json({ error: "CPF inválido" }, { status: 400 });
      }
      const clash = await prisma.customer.findFirst({
        where: { cpf: digits, NOT: { id } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Já existe outro cliente com este CPF" },
          { status: 409 }
        );
      }
      cpf = digits;
    }
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(cpf !== undefined ? { cpf } : {}),
    },
  });

  if (name !== undefined && existing.userId) {
    await prisma.user.update({
      where: { id: existing.userId },
      data: { name },
    });
  }

  void writeAuditLog({
    category: "customers",
    action: "update",
    summary: `Dados do cliente atualizados: ${updated.email}`,
    entityType: "Customer",
    entityId: id,
    detail: { name, phone, cpf: cpf ?? undefined },
    actor: actorFromSession(session),
    ip: requestIp(req),
    source: "admin",
  });

  return NextResponse.json({ ok: true, customer: updated });
}
