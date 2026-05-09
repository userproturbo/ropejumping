-- CreateEnum
CREATE TYPE "PostPinTargetType" AS ENUM ('TEAM', 'EVENT', 'OBJECT');

-- CreateTable
CREATE TABLE "PostPin" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "targetType" "PostPinTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "pinnedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostPin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostPin_postId_idx" ON "PostPin"("postId");

-- CreateIndex
CREATE INDEX "PostPin_targetType_targetId_idx" ON "PostPin"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PostPin_pinnedById_idx" ON "PostPin"("pinnedById");

-- CreateIndex
CREATE INDEX "PostPin_createdAt_idx" ON "PostPin"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostPin_postId_targetType_targetId_key" ON "PostPin"("postId", "targetType", "targetId");

-- AddForeignKey
ALTER TABLE "PostPin" ADD CONSTRAINT "PostPin_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostPin" ADD CONSTRAINT "PostPin_pinnedById_fkey" FOREIGN KEY ("pinnedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
