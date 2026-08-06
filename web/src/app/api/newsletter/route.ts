import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const name = body.name ? String(body.name).trim() : null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido" },
        { status: 400 }
      );
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.newsletterSubscriber.update({
          where: { email },
          data: { active: true, name: name || existing.name },
        });
      }
      return NextResponse.json({
        ok: true,
        message: "Você já está inscrita. Obrigada!",
      });
    }

    await prisma.newsletterSubscriber.create({
      data: { email, name, source: "home" },
    });

    return NextResponse.json({
      ok: true,
      message: "Inscrição confirmada! Em breve você receberá novidades.",
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível salvar a inscrição" },
      { status: 500 }
    );
  }
}
