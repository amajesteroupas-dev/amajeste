import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** Gera código único de cupom (ex: MAJ-K7P2XQ). Nunca reutiliza. */
export async function generateUniqueCouponCode(
  prefix = "MAJ"
): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const raw = randomBytes(4).toString("hex").toUpperCase();
    const code = `${prefix}-${raw.slice(0, 6)}`;
    const [onLook, onCoupon] = await Promise.all([
      prisma.lookPost.findUnique({ where: { rewardCode: code }, select: { id: true } }),
      prisma.discountCoupon.findUnique({ where: { code }, select: { id: true } }),
    ]);
    if (!onLook && !onCoupon) return code;
  }
  // fallback extremo
  return `${prefix}-${Date.now().toString(36).toUpperCase()}${randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;
}
