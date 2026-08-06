import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";

/** Cliente envia avaliação — fica PENDING até o admin aprovar */
export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json(
      { error: "Faça login para avaliar o produto" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "").trim();
  const rating = Number(body.rating);
  const title = body.title ? String(body.title).trim().slice(0, 120) : null;
  const text = String(body.body || "").trim();

  if (!productId) {
    return NextResponse.json({ error: "Produto inválido" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Escolha uma nota de 1 a 5 estrelas" },
      { status: 400 }
    );
  }
  if (text.length < 8) {
    return NextResponse.json(
      { error: "Escreva um comentário com pelo menos 8 caracteres" },
      { status: 400 }
    );
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Comentário muito longo (máx. 2000 caracteres)" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, active: true, deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const existing = await prisma.productReview.findUnique({
    where: {
      customerId_productId: { customerId: customer.id, productId },
    },
  });

  if (existing) {
    if (existing.status === "APPROVED") {
      return NextResponse.json(
        { error: "Você já avaliou este produto" },
        { status: 409 }
      );
    }
    const updated = await prisma.productReview.update({
      where: { id: existing.id },
      data: {
        rating,
        title,
        body: text,
        status: "PENDING",
      },
    });
    return NextResponse.json({
      ok: true,
      review: updated,
      message:
        "Avaliação atualizada e enviada para aprovação. Em breve aparecerá na loja.",
    });
  }

  const review = await prisma.productReview.create({
    data: {
      customerId: customer.id,
      productId,
      rating,
      title,
      body: text,
      status: "PENDING",
    },
  });

  return NextResponse.json({
    ok: true,
    review,
    message:
      "Obrigada! Sua avaliação foi enviada e aparecerá após aprovação da Majesté.",
  });
}
