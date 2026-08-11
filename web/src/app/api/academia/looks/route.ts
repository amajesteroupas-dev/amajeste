import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { processAndSaveImage } from "@/lib/images";
import {
  LOOK_IMAGE_CONSENT_VERSION,
  clientIpFromRequest,
} from "@/lib/look-image-consent";
import { LOOK_REWARD_PERCENT } from "@/lib/look-reward";

/** Lista looks do cliente logado */
export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.lookPost.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { coupon: true },
  });
  return NextResponse.json(
    items.map((l) => ({
      ...l,
      imageConsentAcceptedAt: l.imageConsentAcceptedAt?.toISOString() ?? null,
      createdAt: l.createdAt.toISOString(),
      updatedAt: l.updatedAt.toISOString(),
    }))
  );
}

/** Publica look — fica PENDING até o admin aprovar (aí gera cupom) */
export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const consentRaw = String(form.get("imageConsent") || "")
    .trim()
    .toLowerCase();
  if (consentRaw !== "true" && consentRaw !== "1" && consentRaw !== "on") {
    return NextResponse.json(
      {
        error:
          "É obrigatório aceitar o Termo de consentimento de imagem para enviar o look.",
      },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Envie uma foto" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const saved = await processAndSaveImage(
    buffer,
    file.name || "look.jpg",
    "looks"
  );

  const caption = form.get("caption") ? String(form.get("caption")).trim() : "";
  const productName = form.get("productName")
    ? String(form.get("productName")).trim()
    : "";

  if (!productName) {
    return NextResponse.json(
      { error: "Selecione o nome da peça conforme o produto no site" },
      { status: 400 }
    );
  }

  const product = await prisma.product.findFirst({
    where: { name: productName, active: true, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!product) {
    return NextResponse.json(
      { error: "Peça inválida. Escolha um produto da lista da loja." },
      { status: 400 }
    );
  }

  if (caption.length < 10) {
    return NextResponse.json(
      { error: "Conte como a peça combina (mínimo 10 caracteres)" },
      { status: 400 }
    );
  }

  const look = await prisma.lookPost.create({
    data: {
      customerId: customer.id,
      imageUrl: saved.url,
      caption: caption.slice(0, 800),
      productName: product.name,
      status: "PENDING",
      rewardPercent: LOOK_REWARD_PERCENT,
      imageConsentAcceptedAt: new Date(),
      imageConsentVersion: LOOK_IMAGE_CONSENT_VERSION,
      imageConsentIp: clientIpFromRequest(req),
    },
  });

  return NextResponse.json({
    ...look,
    imageConsentAcceptedAt: look.imageConsentAcceptedAt?.toISOString() ?? null,
    createdAt: look.createdAt.toISOString(),
    updatedAt: look.updatedAt.toISOString(),
    message:
      "Look enviado! Assim que a Majesté aprovar, você recebe um cupom exclusivo de 10%.",
  });
}

export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });

  const existing = await prisma.lookPost.findFirst({
    where: { id, customerId: customer.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }
  if (existing.status === "APPROVED") {
    return NextResponse.json(
      { error: "Looks aprovados não podem ser removidos por aqui" },
      { status: 400 }
    );
  }

  await prisma.lookPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
