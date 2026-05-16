-- CreateTable
CREATE TABLE "ObjectImpression" (
    "id" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "ObjectImpression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ObjectImpression_objectId_idx" ON "ObjectImpression"("objectId");

-- CreateIndex
CREATE INDEX "ObjectImpression_authorId_idx" ON "ObjectImpression"("authorId");

-- CreateIndex
CREATE INDEX "ObjectImpression_createdAt_idx" ON "ObjectImpression"("createdAt");

-- CreateIndex
CREATE INDEX "ObjectImpression_hiddenAt_idx" ON "ObjectImpression"("hiddenAt");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectImpression_objectId_authorId_key" ON "ObjectImpression"("objectId", "authorId");

-- AddForeignKey
ALTER TABLE "ObjectImpression" ADD CONSTRAINT "ObjectImpression_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "JumpObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectImpression" ADD CONSTRAINT "ObjectImpression_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
