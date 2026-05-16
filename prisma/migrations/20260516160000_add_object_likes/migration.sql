-- CreateTable
CREATE TABLE "ObjectLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObjectLike_userId_idx" ON "ObjectLike"("userId");

-- CreateIndex
CREATE INDEX "ObjectLike_objectId_idx" ON "ObjectLike"("objectId");

-- CreateIndex
CREATE INDEX "ObjectLike_createdAt_idx" ON "ObjectLike"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectLike_userId_objectId_key" ON "ObjectLike"("userId", "objectId");

-- AddForeignKey
ALTER TABLE "ObjectLike" ADD CONSTRAINT "ObjectLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectLike" ADD CONSTRAINT "ObjectLike_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "JumpObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
