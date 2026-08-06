-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbUrl" TEXT,
    "title" TEXT,
    "sourceUrl" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'upload',
    "durationSec" INTEGER,
    "bytes" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAsset_createdAt_idx" ON "VideoAsset"("createdAt");

-- CreateIndex
CREATE INDEX "VideoAsset_platform_idx" ON "VideoAsset"("platform");

-- CreateIndex
CREATE INDEX "VideoAsset_active_idx" ON "VideoAsset"("active");
