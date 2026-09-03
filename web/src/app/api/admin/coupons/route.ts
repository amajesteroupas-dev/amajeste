import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueCouponCode } from "@/lib/coupon-code";
import {
  COUPON_KIND_INFLUENCER,
  LOOK_REWARD_PERCENT,
} from "@/lib/look-reward";

function normalizeCode(raw: string) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

/** Lista cupons (influencer + looks). */
export async function GET() {
  const session = await adminAuth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const coupons = await prisma.discountCoupon.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true, email: true } },
      lookPost: { select: { id: true } },
    },
  });

  return NextResponse.json({ coupons });
}

/**
 * Cria cupom de influencer Instagram (público, multi-uso).
 * Body: { code?, label?, percent?, maxUses?, expiresAt? }
 */
export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const label = String(body.label || "")
    .trim()
    .slice(0, 80);
  let percent = Number(body.percent);
  if (!Number.isFinite(percent) || percent <= 0) percent = LOOK_REWARD_PERCENT;
  percent = Math.min(90, Math.max(1, Math.round(percent * 100) / 100));

  let maxUses: number | null = null;
  if (body.maxUses != null && body.maxUses !== "") {
    const n = Math.round(Number(body.maxUses));
    if (Number.isFinite(n) && n > 0) maxUses = Math.min(100000, n);
  }

  let expiresAt: Date | null = null;
  if (body.expiresAt) {
    const d = new Date(String(body.expiresAt));
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  let code = normalizeCode(String(body.code || ""));
  if (!code) {
    code = await generateUniqueCouponCode("IG");
  } else {
    if (code.length < 3 || code.length > 32) {
      return NextResponse.json(
        { error: "Código deve ter entre 3 e 32 caracteres" },
        { status: 400 }
      );
    }
    const [onLook, onCoupon] = await Promise.all([
      prisma.lookPost.findUnique({
        where: { rewardCode: code },
        select: { id: true },
      }),
      prisma.discountCoupon.findUnique({
        where: { code },
        select: { id: true },
      }),
    ]);
    if (onLook || onCoupon) {
      return NextResponse.json(
        { error: "Este código já existe. Escolha outro." },
        { status: 409 }
      );
    }
  }

  const coupon = await prisma.discountCoupon.create({
    data: {
      code,
      percent,
      kind: COUPON_KIND_INFLUENCER,
      label: label || null,
      customerId: null,
      lookPostId: null,
      maxUses,
      usageCount: 0,
      active: true,
      used: false,
      expiresAt,
    },
  });

  return NextResponse.json({ ok: true, coupon });
}
