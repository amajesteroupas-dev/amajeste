import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * Confirma a senha do usuário logado (ADMIN/STAFF)
 * para liberar a edição do token Melhor Envio.
 */
export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!password) {
    return NextResponse.json({ error: "Informe a senha" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, role: true },
  });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Usuário inválido" }, { status: 400 });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 403 });
  }

  return NextResponse.json({ ok: true, unlocked: true });
}
