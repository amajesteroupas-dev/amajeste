-- CreateTable
CREATE TABLE IF NOT EXISTS "TrafficCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'paid',
    "objective" TEXT,
    "spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrafficCampaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TrafficCampaign_platform_startedAt_idx" ON "TrafficCampaign"("platform", "startedAt");
CREATE INDEX IF NOT EXISTS "TrafficCampaign_kind_startedAt_idx" ON "TrafficCampaign"("kind", "startedAt");
CREATE INDEX IF NOT EXISTS "TrafficCampaign_active_startedAt_idx" ON "TrafficCampaign"("active", "startedAt");
