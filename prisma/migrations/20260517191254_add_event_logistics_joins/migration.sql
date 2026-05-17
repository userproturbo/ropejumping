-- CreateTable
CREATE TABLE "EventLogisticsJoin" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "EventLogisticsJoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventLogisticsJoin_postId_idx" ON "EventLogisticsJoin"("postId");

-- CreateIndex
CREATE INDEX "EventLogisticsJoin_userId_idx" ON "EventLogisticsJoin"("userId");

-- CreateIndex
CREATE INDEX "EventLogisticsJoin_cancelledAt_idx" ON "EventLogisticsJoin"("cancelledAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventLogisticsJoin_postId_userId_key" ON "EventLogisticsJoin"("postId", "userId");

-- AddForeignKey
ALTER TABLE "EventLogisticsJoin" ADD CONSTRAINT "EventLogisticsJoin_postId_fkey" FOREIGN KEY ("postId") REFERENCES "EventLogisticsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogisticsJoin" ADD CONSTRAINT "EventLogisticsJoin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
