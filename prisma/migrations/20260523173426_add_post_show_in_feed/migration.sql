-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "showInFeed" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Post_showInFeed_idx" ON "Post"("showInFeed");
