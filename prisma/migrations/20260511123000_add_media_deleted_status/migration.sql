-- AlterEnum
ALTER TYPE "MediaStatus" ADD VALUE 'DELETED';

-- AlterTable
ALTER TABLE "Media"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Media_deletedAt_idx" ON "Media"("deletedAt");
