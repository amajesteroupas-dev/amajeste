-- AlterTable
ALTER TABLE "DiscountCoupon" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'LOOK';
ALTER TABLE "DiscountCoupon" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "DiscountCoupon" ADD COLUMN IF NOT EXISTS "maxUses" INTEGER;
ALTER TABLE "DiscountCoupon" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DiscountCoupon" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "DiscountCoupon_kind_idx" ON "DiscountCoupon"("kind");
CREATE INDEX IF NOT EXISTS "DiscountCoupon_active_idx" ON "DiscountCoupon"("active");
