-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "reservedUntil" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "stockHeld" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_reservedUntil_status_idx" ON "Order"("reservedUntil", "status");
CREATE INDEX IF NOT EXISTS "Order_stockHeld_status_idx" ON "Order"("stockHeld", "status");
