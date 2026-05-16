-- CreateTable
CREATE TABLE "TeamFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "objectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObjectFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamFollow_userId_idx" ON "TeamFollow"("userId");

-- CreateIndex
CREATE INDEX "TeamFollow_teamId_idx" ON "TeamFollow"("teamId");

-- CreateIndex
CREATE INDEX "TeamFollow_createdAt_idx" ON "TeamFollow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamFollow_userId_teamId_key" ON "TeamFollow"("userId", "teamId");

-- CreateIndex
CREATE INDEX "ObjectFollow_userId_idx" ON "ObjectFollow"("userId");

-- CreateIndex
CREATE INDEX "ObjectFollow_objectId_idx" ON "ObjectFollow"("objectId");

-- CreateIndex
CREATE INDEX "ObjectFollow_createdAt_idx" ON "ObjectFollow"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectFollow_userId_objectId_key" ON "ObjectFollow"("userId", "objectId");

-- AddForeignKey
ALTER TABLE "TeamFollow" ADD CONSTRAINT "TeamFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFollow" ADD CONSTRAINT "TeamFollow_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectFollow" ADD CONSTRAINT "ObjectFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObjectFollow" ADD CONSTRAINT "ObjectFollow_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "JumpObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
