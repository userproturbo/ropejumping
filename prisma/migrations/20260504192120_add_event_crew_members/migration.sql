-- CreateTable
CREATE TABLE "EventCrewMember" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "functionRoles" "TeamFunctionRole"[] DEFAULT ARRAY[]::"TeamFunctionRole"[],
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCrewMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventCrewMember_eventId_idx" ON "EventCrewMember"("eventId");

-- CreateIndex
CREATE INDEX "EventCrewMember_teamMemberId_idx" ON "EventCrewMember"("teamMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCrewMember_eventId_teamMemberId_key" ON "EventCrewMember"("eventId", "teamMemberId");

-- AddForeignKey
ALTER TABLE "EventCrewMember" ADD CONSTRAINT "EventCrewMember_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCrewMember" ADD CONSTRAINT "EventCrewMember_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
