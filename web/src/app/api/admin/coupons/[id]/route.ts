import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  COUPON_KIND_INFLUENCER,
  COUPON_KIND_PROMO,
  isPublicMultiUseCoupon,
} from "@/lib/look-reward";

type Ctx = { params: Promise<{ id: string }> };

/** Ativa/desativa ou ajusta cupom público (influencer / promoção). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await adminAuth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.discountCoupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });
  }
  if (!isPublicMultiUseCoupon(existing)) {
    return NextResponse.json(
      { error: "Só cupons públicos (influencer/promoção) podem ser editados aqui" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const data: {
    active?: boolean;
    used?: boolean;
    label?: string | null;
    percent?: number;
    maxUses?: number | null;
    minSubtotal?: number | null;
    expiresAt?: Date | null;
    kind?: string;
  } = {};

  if (typeof body.active === "boolean") {
    data.active = body.active;
    if (!body.active) data.used = true;
    else if (existing.maxUses == null || existing.usageCount < existing.maxUses) {
      data.used = false;
    }
  }
  if (body.label !== undefined) {
    data.label = String(body.label || "").trim().slice(0, 80) || null;
  }
  if (body.percent != null) {
    const p = Number(body.percent);
    if (Number.isFinite(p) && p > 0) {
      data.percent = Math.min(90, Math.max(1, Math.round(p * 100) / 100));
    }
  }
  if (body.maxUses !== undefined) {
    if (body.maxUses === null || body.maxUses === "") data.maxUses = null;
    else {
      const n = Math.round(Number(body.maxUses));
      if (Number.isFinite(n) && n > 0) data.maxUses = Math.min(100000, n);
    }
  }
  if (body.minSubtotal !== undefined) {
    if (body.minSubtotal === null || body.minSubtotal === "") {
      data.minSubtotal = null;
    } else {
      const n = Number(body.minSubtotal);
      if (Number.isFinite(n) && n > 0) {
        data.minSubtotal = Math.round(n * 100) / 100;
      } else {
        data.minSubtotal = null;
      }
    }
  }
  if (body.expiresAt !== undefined) {
    if (!body.expiresAt) data.expiresAt = null;
    else {
      const d = new Date(String(body.expiresAt));
      if (!Number.isNaN(d.getTime())) data.expiresAt = d;
    }
  }
  if (body.kind != null) {
    const k = String(body.kind).toUpperCase();
    if (k === COUPON_KIND_PROMO || k === COUPON_KIND_INFLUENCER) data.kind = k;
  }

  const coupon = await prisma.discountCoupon.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true, coupon });
}

/** Remove cupom público. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const session = await adminAuth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await prisma.discountCoupon.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Cupom não encontrado" }, { status: 404 });
  }
  if (!isPublicMultiUseCoupon(existing)) {
    return NextResponse.json(
      { error: "Cupons de look não podem ser excluídos por aqui" },
      { status: 400 }
    );
  }

  await prisma.discountCoupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
