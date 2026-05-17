-- CreateEnum
CREATE TYPE "EventLogisticsType" AS ENUM ('OFFER_SEAT', 'NEED_SEAT', 'GOING_TOGETHER');

-- CreateEnum
CREATE TYPE "EventLogisticsStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateTable
CREATE TABLE "EventLogisticsPost" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "EventLogisticsType" NOT NULL,
    "status" "EventLogisticsStatus" NOT NULL DEFAULT 'ACTIVE',
    "fromLocation" TEXT,
    "departureTimeText" TEXT,
    "seatsAvailable" INTEGER,
    "baggageNote" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "EventLogisticsPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventLogisticsPost_eventId_idx" ON "EventLogisticsPost"("eventId");

-- CreateIndex
CREATE INDEX "EventLogisticsPost_authorId_idx" ON "EventLogisticsPost"("authorId");

-- CreateIndex
CREATE INDEX "EventLogisticsPost_type_idx" ON "EventLogisticsPost"("type");

-- CreateIndex
CREATE INDEX "EventLogisticsPost_status_idx" ON "EventLogisticsPost"("status");

-- CreateIndex
CREATE INDEX "EventLogisticsPost_createdAt_idx" ON "EventLogisticsPost"("createdAt");

-- CreateIndex
CREATE INDEX "EventLogisticsPost_hiddenAt_idx" ON "EventLogisticsPost"("hiddenAt");

-- AddForeignKey
ALTER TABLE "EventLogisticsPost" ADD CONSTRAINT "EventLogisticsPost_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogisticsPost" ADD CONSTRAINT "EventLogisticsPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
