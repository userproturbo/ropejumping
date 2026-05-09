-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_ADDED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_REMOVED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_ROLE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_FUNCTION_ROLES_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_OWNER_TRANSFERRED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_LEFT';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_JOIN_REQUEST_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_JOIN_REQUEST_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_INVITATION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_INVITATION_CANCELLED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_INVITATION_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_INVITATION_REJECTED';
