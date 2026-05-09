import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { AuditAction } from "@/generated/prisma/enums";
import type { db as database } from "@/server/db";

type AuditDb = Pick<typeof database, "auditLog">;

type CreateAuditLogInput = {
  actorId?: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
};

export const createAuditLog = async (
  db: AuditDb,
  input: CreateAuditLogInput,
) => {
  return db.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });
};
