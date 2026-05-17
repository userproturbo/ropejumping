-- CreateTable
CREATE TABLE "TeamChatMessage" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentMessageId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),

    CONSTRAINT "TeamChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamChatMessage_teamId_idx" ON "TeamChatMessage"("teamId");

-- CreateIndex
CREATE INDEX "TeamChatMessage_authorId_idx" ON "TeamChatMessage"("authorId");

-- CreateIndex
CREATE INDEX "TeamChatMessage_parentMessageId_idx" ON "TeamChatMessage"("parentMessageId");

-- CreateIndex
CREATE INDEX "TeamChatMessage_createdAt_idx" ON "TeamChatMessage"("createdAt");

-- CreateIndex
CREATE INDEX "TeamChatMessage_deletedAt_idx" ON "TeamChatMessage"("deletedAt");

-- CreateIndex
CREATE INDEX "TeamChatMessage_hiddenAt_idx" ON "TeamChatMessage"("hiddenAt");

-- AddForeignKey
ALTER TABLE "TeamChatMessage" ADD CONSTRAINT "TeamChatMessage_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatMessage" ADD CONSTRAINT "TeamChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatMessage" ADD CONSTRAINT "TeamChatMessage_parentMessageId_fkey" FOREIGN KEY ("parentMessageId") REFERENCES "TeamChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
