import { prisma } from "@/lib/prisma";

export function nowTimestamp() {
  return new Date();
}

export async function createAuditLog(entry: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  changes?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      changes: entry.changes ?? null,
      createdAt: nowTimestamp(),
    },
  });
}
