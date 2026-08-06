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
    const phone = body.phone ? String(body.phone).trim() : null;
    const productId = String(body.productId || "").trim();
    const variantId = body.variantId
      ? String(body.variantId).trim()
      : null;
    const size = body.size ? String(body.size).trim() : null;
    const color = body.color ? String(body.color).trim() : null;

    if (!productId || !email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Informe um e-mail válido." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, active: true, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!product) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 }
      );
    }

    let resolvedVariantId = variantId;
    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId, active: true },
        select: { id: true },
      });
      if (!variant) {
        resolvedVariantId = null;
      }
    }

    const existing = await prisma.stockAlert.findFirst({
      where: {
        email,
        productId,
        variantId: resolvedVariantId,
        notified: false,
      },
    });

    if (existing) {
      if (phone && phone !== existing.phone) {
        await prisma.stockAlert.update({
          where: { id: existing.id },
          data: { phone, size: size || existing.size, color: color || existing.color },
        });
      }
      return NextResponse.json({
        ok: true,
        message: "Você já está na lista. Avisaremos assim que chegar.",
      });
    }

    await prisma.stockAlert.create({
      data: {
        email,
        phone,
        productId,
        variantId: resolvedVariantId,
        size,
        color,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Pronto! Avisaremos quando este item estiver disponível.",
    });
  } catch (e) {
    console.error("stock-alerts", e);
    return NextResponse.json(
      { error: "Não foi possível cadastrar o aviso." },
      { status: 500 }
    );
  }
}
