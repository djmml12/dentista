import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();

const updateSchema = z.object({
  workStart: z.number().int().min(0).max(22),
  workEnd: z.number().int().min(1).max(24),
}).refine((d) => d.workEnd > d.workStart + 1, {
  message: 'La hora de fin debe ser al menos 2 horas después de la de inicio',
});

async function getOrCreate() {
  const existing = await prisma.clinicConfig.findFirst();
  if (existing) return existing;
  return prisma.clinicConfig.create({ data: {} });
}

// GET público para autenticados (el calendario lo necesita sin rol especial)
router.get('/', requireAuth, asyncH(async (_req, res) => {
  res.json(await getOrCreate());
}));

// PUT solo ADMIN
router.put(
  '/',
  requireAuth,
  requireRole('ADMIN'),
  validate(updateSchema),
  asyncH(async (req, res) => {
    const { workStart, workEnd } = req.body as { workStart: number; workEnd: number };
    const existing = await prisma.clinicConfig.findFirst();
    const config = existing
      ? await prisma.clinicConfig.update({ where: { id: existing.id }, data: { workStart, workEnd } })
      : await prisma.clinicConfig.create({ data: { workStart, workEnd } });
    res.json(config);
  }),
);

export default router;
