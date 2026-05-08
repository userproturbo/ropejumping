-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'EVENT_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_JOIN_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'TEAM_INVITATION_REJECTED';
