/**
 * Alinha cupons/looks Influence para 10% e republica looks que já têm cupom
 * mas ficaram fora da galeria (status ≠ APPROVED).
 * Idempotente — seguro rodar a cada start do container.
 */
const { PrismaClient } = require("@prisma/client");

const LOOK_REWARD_PERCENT = 10;

async function main() {
  const prisma = new PrismaClient();
  try {
    const coupons = await prisma.discountCoupon.updateMany({
      where: { lookPostId: { not: null } },
      data: { percent: LOOK_REWARD_PERCENT },
    });

    const looksPercent = await prisma.lookPost.updateMany({
      data: { rewardPercent: LOOK_REWARD_PERCENT },
    });

    // Cupom gerado = look deveria estar na galeria
    const republished = await prisma.lookPost.updateMany({
      where: {
        status: { not: "APPROVED" },
        OR: [
          { rewardCode: { not: null } },
          { coupon: { isNot: null } },
        ],
      },
      data: { status: "APPROVED" },
    });

    console.log(
      `[look-rewards] coupons→${LOOK_REWARD_PERCENT}%: ${coupons.count}; looks %: ${looksPercent.count}; republished: ${republished.count}`
    );
  } catch (e) {
    console.warn("[look-rewards] skip:", e?.message || e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
