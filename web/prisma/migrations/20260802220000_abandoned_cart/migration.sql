-- CreateTable
CREATE TABLE IF NOT EXISTS "AbandonedCart" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "itemsJson" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "remindedAt" TIMESTAMP(3),
    "recoveredAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AbandonedCart_sessionId_key" ON "AbandonedCart"("sessionId");
CREATE INDEX IF NOT EXISTS "AbandonedCart_status_lastSeenAt_idx" ON "AbandonedCart"("status", "lastSeenAt");
CREATE INDEX IF NOT EXISTS "AbandonedCart_email_status_idx" ON "AbandonedCart"("email", "status");
CREATE INDEX IF NOT EXISTS "AbandonedCart_remindedAt_idx" ON "AbandonedCart"("remindedAt");
