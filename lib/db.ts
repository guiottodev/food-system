import { prisma } from "@/lib/prisma";

export function nowTimestamp() {
  return new Date();
}

export async function createAuditLog(entry: {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  field?: string | null;
  beforeValue?: string | null;
  afterValue?: string | null;
  reason?: string | null;
  changes?: string | null;
}) {
  return prisma.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      field: entry.field ?? null,
      beforeValue: entry.beforeValue ?? null,
      afterValue: entry.afterValue ?? null,
      reason: entry.reason ?? null,
      changes: entry.changes ?? null,
      createdAt: nowTimestamp(),
    },
  });
}
