-- CreateEnum
CREATE TYPE "TeamJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED_BY_USER');

-- CreateEnum
CREATE TYPE "TeamFunctionRole" AS ENUM ('OPERATOR', 'PHOTOGRAPHER', 'MEDIC', 'INSTRUCTOR', 'COORDINATOR', 'RADIO_OPERATOR');

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "functionRoles" "TeamFunctionRole"[] DEFAULT ARRAY[]::"TeamFunctionRole"[];

-- CreateTable
CREATE TABLE "TeamJoinRequest" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "TeamJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamJoinRequest_teamId_idx" ON "TeamJoinRequest"("teamId");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_userId_idx" ON "TeamJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_teamId_status_idx" ON "TeamJoinRequest"("teamId", "status");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_userId_status_idx" ON "TeamJoinRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "TeamJoinRequest_decidedById_idx" ON "TeamJoinRequest"("decidedById");

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamJoinRequest" ADD CONSTRAINT "TeamJoinRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
