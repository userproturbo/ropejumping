-- CreateTable
CREATE TABLE "EventChatReadState" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventChatReadState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamChatReadState" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamChatReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventChatReadState_eventId_idx" ON "EventChatReadState"("eventId");

-- CreateIndex
CREATE INDEX "EventChatReadState_userId_idx" ON "EventChatReadState"("userId");

-- CreateIndex
CREATE INDEX "EventChatReadState_lastReadAt_idx" ON "EventChatReadState"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "EventChatReadState_eventId_userId_key" ON "EventChatReadState"("eventId", "userId");

-- CreateIndex
CREATE INDEX "TeamChatReadState_teamId_idx" ON "TeamChatReadState"("teamId");

-- CreateIndex
CREATE INDEX "TeamChatReadState_userId_idx" ON "TeamChatReadState"("userId");

-- CreateIndex
CREATE INDEX "TeamChatReadState_lastReadAt_idx" ON "TeamChatReadState"("lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChatReadState_teamId_userId_key" ON "TeamChatReadState"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "EventChatReadState" ADD CONSTRAINT "EventChatReadState_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventChatReadState" ADD CONSTRAINT "EventChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatReadState" ADD CONSTRAINT "TeamChatReadState_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChatReadState" ADD CONSTRAINT "TeamChatReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
