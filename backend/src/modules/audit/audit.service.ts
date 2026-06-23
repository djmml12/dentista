import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export async function logAudit(params: {
  actorId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ?? Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('audit log failed', err);
  }
}
