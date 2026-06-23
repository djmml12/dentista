import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';

const router = Router();
router.use(requireAuth);

const listSchema = z.object({
  q: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// Búsqueda para autocompletar al crear recetas.
router.get(
  '/',
  validate(listSchema, 'query'),
  asyncH(async (req, res) => {
    const { q, limit } = req.query as unknown as { q?: string; limit: number };
    const where: Prisma.MedicationWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};
    const meds = await prisma.medication.findMany({
      where,
      orderBy: [{ name: 'asc' }, { strength: 'asc' }],
      take: limit,
    });
    res.json(meds);
  }),
);

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  form: z.string().trim().max(120).optional().nullable(),
  strength: z.string().trim().max(120).optional().nullable(),
});

// Permite añadir un medicamento nuevo al catálogo (lo reutiliza el autocompletado).
router.post(
  '/',
  requireRole('ADMIN', 'DENTIST'),
  validate(createSchema),
  asyncH(async (req, res) => {
    const body = req.body as { name: string; form?: string | null; strength?: string | null };
    try {
      const med = await prisma.medication.create({
        data: { name: body.name, form: body.form ?? null, strength: body.strength ?? null },
      });
      res.status(201).json(med);
    } catch (err) {
      // Ya existe (misma combinación nombre/forma/concentración): devolvemos el existente.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await prisma.medication.findFirst({
          where: { name: body.name, form: body.form ?? null, strength: body.strength ?? null },
        });
        if (existing) return res.json(existing);
      }
      throw err;
    }
  }),
);

export default router;
