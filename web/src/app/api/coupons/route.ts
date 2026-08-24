import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/customer";

/** Cupons disponíveis da cliente logada (não usados / não expirados). */
export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ coupons: [] });
  }

  const now = new Date();
  const rows = await prisma.discountCoupon.findMany({
    where: {
      customerId: customer.id,
      used: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { lookPost: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });

  const coupons = rows
    .filter((c) => !c.lookPost || c.lookPost.status === "APPROVED")
    .map((c) => ({
      code: c.code,
      percent: c.percent,
      expiresAt: c.expiresAt,
    }));

  // Cupons antigos só no LookPost (sem linha DiscountCoupon)
  const looks = await prisma.lookPost.findMany({
    where: {
      customerId: customer.id,
      status: "APPROVED",
      rewardUsed: false,
      rewardCode: { not: null },
    },
    select: { rewardCode: true, rewardPercent: true },
  });
  const known = new Set(coupons.map((c) => c.code));
  for (const look of looks) {
    const code = String(look.rewardCode || "")
      .trim()
      .toUpperCase();
    if (!code || known.has(code)) continue;
    known.add(code);
    coupons.push({
      code,
      percent: look.rewardPercent || 5,
      expiresAt: null,
    });
  }

  return NextResponse.json({ coupons });
}
