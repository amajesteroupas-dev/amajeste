-- CreateTable
CREATE TABLE "StoreStory" (
    "id" TEXT NOT NULL,
    "videoUrl" TEXT NOT NULL,
    "title" TEXT,
    "question" TEXT,
    "questionOpts" TEXT,
    "shopHref" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryAnswer" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreStory_active_sortOrder_idx" ON "StoreStory"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "StoryAnswer_storyId_createdAt_idx" ON "StoryAnswer"("storyId", "createdAt");

-- AddForeignKey
ALTER TABLE "StoryAnswer" ADD CONSTRAINT "StoryAnswer_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "StoreStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
