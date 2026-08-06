-- AlterTable
ALTER TABLE "StoryAnswer" ADD COLUMN IF NOT EXISTS "kind" TEXT NOT NULL DEFAULT 'poll';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StoryAnswer_kind_createdAt_idx" ON "StoryAnswer"("kind", "createdAt");
