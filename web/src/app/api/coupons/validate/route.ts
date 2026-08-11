import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";
import { lookRewardPercent } from "@/lib/look-reward";

/** Valida cupom de look / embaixadora */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

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
      });
    }
    return NextResponse.json({ error: "Cupom inválido" }, { status: 404 });
  }

  if (coupon.used) {
    return NextResponse.json({ error: "Este cupom já foi usado" }, { status: 400 });
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return NextResponse.json({ error: "Cupom expirado" }, { status: 400 });
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

  return NextResponse.json({
    ok: true,
    code: coupon.code,
    percent: lookRewardPercent(coupon.percent),
    lookPostId: coupon.lookPostId,
  });
}
