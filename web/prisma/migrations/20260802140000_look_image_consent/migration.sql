-- AlterTable
ALTER TABLE "LookPost" ADD COLUMN IF NOT EXISTS "imageConsentAcceptedAt" TIMESTAMP(3);
ALTER TABLE "LookPost" ADD COLUMN IF NOT EXISTS "imageConsentVersion" TEXT;
ALTER TABLE "LookPost" ADD COLUMN IF NOT EXISTS "imageConsentIp" TEXT;
