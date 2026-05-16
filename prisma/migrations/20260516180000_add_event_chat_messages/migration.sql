-- CreateTable
CREATE TABLE "EventChatMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "EventChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventChatMessage_eventId_idx" ON "EventChatMessage"("eventId");

-- CreateIndex
CREATE INDEX "EventChatMessage_authorId_idx" ON "EventChatMessage"("authorId");

-- CreateIndex
CREATE INDEX "EventChatMessage_createdAt_idx" ON "EventChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "EventChatMessage_deletedAt_idx" ON "EventChatMessage"("deletedAt");

-- CreateIndex
CREATE INDEX "EventChatMessage_hiddenAt_idx" ON "EventChatMessage"("hiddenAt");

-- AddForeignKey
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
