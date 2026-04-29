-- AlterTable
ALTER TABLE "JumpObject" ADD COLUMN     "createdByTeamId" TEXT;

-- CreateIndex
CREATE INDEX "JumpObject_createdByTeamId_idx" ON "JumpObject"("createdByTeamId");

-- AddForeignKey
ALTER TABLE "JumpObject" ADD CONSTRAINT "JumpObject_createdByTeamId_fkey" FOREIGN KEY ("createdByTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
