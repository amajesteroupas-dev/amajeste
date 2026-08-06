-- AlterTable Order: atribuição de tráfego
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "utmTerm" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "clickId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "attributionSyncedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_utmSource_createdAt_idx" ON "Order"("utmSource", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_utmCampaign_createdAt_idx" ON "Order"("utmCampaign", "createdAt");

-- AlterTable SiteVisit: UTM na visita
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;

CREATE INDEX IF NOT EXISTS "SiteVisit_utmSource_createdAt_idx" ON "SiteVisit"("utmSource", "createdAt");
