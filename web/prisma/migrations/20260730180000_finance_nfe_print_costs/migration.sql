-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfePdfUrl" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeExternalId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeError" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "nfeIssuedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "printStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "printedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitPackaging" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitTax" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PrintJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "externalId" TEXT,
    "error" TEXT,
    "payload" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrintJob_status_createdAt_idx" ON "PrintJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "PrintJob_orderId_idx" ON "PrintJob"("orderId");
CREATE INDEX IF NOT EXISTS "Order_nfeStatus_idx" ON "Order"("nfeStatus");
CREATE INDEX IF NOT EXISTS "Order_printStatus_idx" ON "Order"("printStatus");

DO $$ BEGIN
  ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
