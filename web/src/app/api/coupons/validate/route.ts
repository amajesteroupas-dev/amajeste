import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import {
  isPublicMultiUseCoupon,
  lookRewardPercent,
  resolveCouponPercent,
} from "@/lib/look-reward";
import { formatBRL } from "@/lib/utils";

/** Valida cupom de look / influencer / promoção do site */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const subtotal = Math.max(0, Number(body.subtotal) || 0);

  if (!code) {
    return NextResponse.json({ error: "Informe o cupom" }, { status: 400 });
  }

  const customer = await requireCustomer();

  const coupon = await prisma.discountCoupon.findUnique({
    where: { code },
    include: { lookPost: true },
  });

  // fallback: cupom antigo só no LookPost
  if (!coupon) {
    const look = await prisma.lookPost.findUnique({
      where: { rewardCode: code },
    });
    if (look && look.status === "APPROVED" && !look.rewardUsed) {
      return NextResponse.json({
        ok: true,
        code,
        percent: lookRewardPercent(look.rewardPercent),
        lookPostId: look.id,
        kind: "LOOK",
      });
    }
    return NextResponse.json({ error: "Cupom inválido" }, { status: 404 });
  }

  if (!coupon.active) {
    return NextResponse.json({ error: "Cupom desativado" }, { status: 400 });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
  }

  const publicMulti = isPublicMultiUseCoupon(coupon);

  if (publicMulti) {
    if (coupon.maxUses != null && coupon.usageCount >= coupon.maxUses) {
      return NextResponse.json(
        { error: "Este cupom atingiu o limite de usos" },
        { status: 400 }
      );
    }
  } else if (coupon.used) {
    return NextResponse.json({ error: "Este cupom já foi usado" }, { status: 400 });
  }

  if (coupon.customerId && customer && coupon.customerId !== customer.id) {
    return NextResponse.json(
      { error: "Este cupom é exclusivo de outra cliente" },
      { status: 403 }
    );
  }
  if (coupon.lookPost && coupon.lookPost.status !== "APPROVED") {
    return NextResponse.json({ error: "Cupom indisponível" }, { status: 400 });
  }

  const minSub = Number(coupon.minSubtotal) || 0;
  if (minSub > 0 && subtotal > 0 && subtotal + 0.001 < minSub) {
    return NextResponse.json(
      {
        error: `Este cupom vale para compras a partir de ${formatBRL(minSub)} (subtotal atual: ${formatBRL(subtotal)})`,
        minSubtotal: minSub,
      },
      { status: 400 }
    );
  }
  if (minSub > 0 && subtotal <= 0) {
    // Sem subtotal no body: avisa o mínimo, mas ainda deixa aplicar no preview
    // (o pedido revalida com o subtotal real).
  }

  return NextResponse.json({
    ok: true,
    code: coupon.code,
    percent: resolveCouponPercent(coupon),
    lookPostId: coupon.lookPostId,
    kind: publicMulti ? coupon.kind : "LOOK",
    label: coupon.label || undefined,
    minSubtotal: minSub > 0 ? minSub : undefined,
  });
}
