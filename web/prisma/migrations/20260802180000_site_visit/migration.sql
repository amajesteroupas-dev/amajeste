-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteVisit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "ipPrefix" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT NOT NULL DEFAULT 'unknown',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_createdAt_idx" ON "SiteVisit"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_ipHash_createdAt_idx" ON "SiteVisit"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_deviceType_createdAt_idx" ON "SiteVisit"("deviceType", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SiteVisit_sessionId_createdAt_idx" ON "SiteVisit"("sessionId", "createdAt");
