-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "avatarMediaId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN "logoMediaId" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "coverMediaId" TEXT;

-- AlterTable
ALTER TABLE "JumpObject" ADD COLUMN "coverMediaId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "imageMediaId" TEXT;

-- CreateIndex
CREATE INDEX "Profile_avatarMediaId_idx" ON "Profile"("avatarMediaId");

-- CreateIndex
CREATE INDEX "Team_logoMediaId_idx" ON "Team"("logoMediaId");

-- CreateIndex
CREATE INDEX "Event_coverMediaId_idx" ON "Event"("coverMediaId");

-- CreateIndex
CREATE INDEX "JumpObject_coverMediaId_idx" ON "JumpObject"("coverMediaId");

-- CreateIndex
CREATE INDEX "Post_imageMediaId_idx" ON "Post"("imageMediaId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_avatarMediaId_fkey" FOREIGN KEY ("avatarMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_logoMediaId_fkey" FOREIGN KEY ("logoMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JumpObject" ADD CONSTRAINT "JumpObject_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_imageMediaId_fkey" FOREIGN KEY ("imageMediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
