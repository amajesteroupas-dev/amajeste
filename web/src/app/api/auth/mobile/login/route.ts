import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signMobileToken } from "@/lib/mobile-auth";

/**
 * Login para o app Expo — retorna JWT Bearer (não cookie NextAuth).
 * POST { email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Informe e-mail e senha" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos" },
        { status: 401 }
      );
    }

    if (user.role === "ADMIN" || user.role === "STAFF") {
      return NextResponse.json(
        {
          error:
            "Conta de equipe — use o painel web. O app é para clientes da loja.",
        },
        { status: 403 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        OR: [{ userId: user.id }, { email: user.email }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        userId: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente não encontrado para esta conta" },
        { status: 403 }
      );
    }

    if (!customer.userId) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { userId: user.id },
      });
    }

    const token = await signMobileToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      ok: true,
      token,
      expiresIn: "30d",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        avatarUrl: customer.avatarUrl,
      },
    });
  } catch (e) {
    console.error("[mobile/login]", e);
    return NextResponse.json(
      { error: "Falha no login" },
      { status: 500 }
    );
  }
}
