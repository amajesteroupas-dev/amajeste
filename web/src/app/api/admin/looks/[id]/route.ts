import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { generateUniqueCouponCode } from "@/lib/coupon-code";
import { LOOK_REWARD_PERCENT } from "@/lib/look-reward";

type Ctx = { params: Promise<{ id: string }> };

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "").toUpperCase();

  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const look = await prisma.lookPost.findUnique({
    where: { id },
    include: { coupon: true, customer: true },
  });
  if (!look) {
    return NextResponse.json({ error: "Look não encontrado" }, { status: 404 });
  }

  // Aprovar: gera cupom único se ainda não tiver
  if (status === "APPROVED" && look.status !== "APPROVED") {
    const rewardPercent = LOOK_REWARD_PERCENT;
    const code =
      look.rewardCode ||
      look.coupon?.code ||
      (await generateUniqueCouponCode("MAJ"));

    try {
      const updated = await prisma.$transaction(async (tx) => {
        const next = await tx.lookPost.update({
          where: { id },
          data: {
            status: "APPROVED",
            rewardCode: code,
            rewardPercent,
            rewardUsed: false,
          },
        });

        await tx.discountCoupon.upsert({
          where: { lookPostId: id },
          create: {
            code,
            percent: rewardPercent,
            kind: "LOOK",
            customerId: look.customerId,
            lookPostId: id,
            used: false,
          },
          update: {
            code,
            percent: rewardPercent,
            kind: "LOOK",
            customerId: look.customerId,
            used: false,
            usedAt: null,
            orderId: null,
          },
        });

        // só incrementa créditos na primeira aprovação
        if (!look.rewardCode) {
          await tx.customer.update({
            where: { id: look.customerId },
            data: {
              ambassadorDiscountPercent: { increment: rewardPercent },
              tags: Array.from(
                new Set([...(look.customer.tags || []), "embaixadora"])
              ),
            },
          });
        }

        return next;
      });

      return NextResponse.json({
        ok: true,
        look: updated,
        couponCode: code,
        message: `Aprovado e publicado em /looks. Cupom ${code} (−${rewardPercent}%) gerado para a cliente.`,
      });
    } catch (e) {
      console.error("[admin/looks] approve failed", id, e);
      const detail =
        e instanceof Error ? e.message : "Erro ao aprovar look / gerar cupom";
      return NextResponse.json(
        {
          error: `Não foi possível aprovar (o look continua pendente). ${detail}`,
        },
        { status: 500 }
      );
    }
  }

  try {
    const updated = await prisma.lookPost.update({
      where: { id },
      data: { status: status as "PENDING" | "APPROVED" | "REJECTED" },
    });
    return NextResponse.json({
      ok: true,
      look: updated,
      message:
        status === "APPROVED"
          ? "Look já estava aprovado — permanece publicado em /looks."
          : undefined,
    });
  } catch (e) {
    console.error("[admin/looks] status update failed", id, e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Não foi possível atualizar o status do look.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.lookPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
