-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'UPLOADED', 'FAILED');

-- AlterTable
ALTER TABLE "Media"
  ADD COLUMN "status" "MediaStatus",
  ADD COLUMN "uploadedAt" TIMESTAMP(3);

-- Backfill existing uploaded media before enforcing the future default.
UPDATE "Media"
SET
  "status" = 'UPLOADED',
  "uploadedAt" = "createdAt"
WHERE "status" IS NULL;

-- AlterTable
ALTER TABLE "Media"
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ALTER COLUMN "status" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Media_status_idx" ON "Media"("status");

-- CreateIndex
CREATE INDEX "Media_ownerId_status_idx" ON "Media"("ownerId", "status");
