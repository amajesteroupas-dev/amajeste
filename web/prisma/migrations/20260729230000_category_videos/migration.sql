-- Vídeos por categoria (catálogo “Ao Vivo”)
CREATE TABLE IF NOT EXISTS "CategoryVideo" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CategoryVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CategoryVideo_categoryId_active_idx" ON "CategoryVideo"("categoryId", "active");
CREATE INDEX IF NOT EXISTS "CategoryVideo_sortOrder_idx" ON "CategoryVideo"("sortOrder");

DO $$ BEGIN
  ALTER TABLE "CategoryVideo"
    ADD CONSTRAINT "CategoryVideo_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
