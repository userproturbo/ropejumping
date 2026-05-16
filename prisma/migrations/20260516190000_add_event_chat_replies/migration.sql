-- AlterTable
ALTER TABLE "EventChatMessage" ADD COLUMN "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX "EventChatMessage_parentMessageId_idx" ON "EventChatMessage"("parentMessageId");

-- AddForeignKey
ALTER TABLE "EventChatMessage" ADD CONSTRAINT "EventChatMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "EventChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
