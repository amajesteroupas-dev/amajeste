-- AlterTable
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "videoLayout" TEXT NOT NULL DEFAULT 'sequence';
