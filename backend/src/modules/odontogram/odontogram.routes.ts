import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { logAudit } from '../audit/audit.service.js';

const router = Router({ mergeParams: true });
router.use(requireAuth);

const upsertSchema = z.object({
  condition: z.enum([
    'HEALTHY', 'CARIES', 'FILLED', 'CROWN', 'EXTRACTED',
    'IMPLANT', 'ROOT_CANAL', 'MISSING', 'SEALANT', 'FRACTURE',
  ]),
  surface: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

router.get(
  '/',
  asyncH(async (req, res) => {
    const patientId = req.params.id!;
    const records = await prisma.toothRecord.findMany({
      where: { patientId },
      orderBy: { toothNumber: 'asc' },
    });
    res.json(records);
  }),
);

router.put(
  '/:toothNumber',
  requireRole('ADMIN', 'DENTIST'),
  validate(upsertSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const patientId = req.params.id!;
    const toothNumber = Number(req.params.toothNumber);
    if (!Number.isInteger(toothNumber)) throw new HttpError(400, 'toothNumber inválido');
    const data = req.body as { condition: string; surface?: string | null; notes?: string | null };
    const record = await prisma.toothRecord.upsert({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      create: {
        patientId,
        toothNumber,
        condition: data.condition as never,
        surface: data.surface ?? null,
        notes: data.notes ?? null,
        updatedById: req.user.sub,
      },
      update: {
        condition: data.condition as never,
        surface: data.surface ?? null,
        notes: data.notes ?? null,
        updatedById: req.user.sub,
      },
    });
    await logAudit({
      actorId: req.user.sub,
      action: 'UPDATE',
      entity: 'ToothRecord',
      entityId: record.id,
      metadata: { toothNumber, condition: data.condition },
    });
    res.json(record);
  }),
);

router.delete(
  '/:toothNumber',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const patientId = req.params.id!;
    const toothNumber = Number(req.params.toothNumber);
    await prisma.toothRecord.deleteMany({ where: { patientId, toothNumber } });
    res.status(204).end();
  }),
);

export default router;
