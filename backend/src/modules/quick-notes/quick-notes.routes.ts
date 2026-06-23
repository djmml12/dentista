import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { logAudit } from '../audit/audit.service.js';

const bodySchema = z.object({ body: z.string().trim().min(1).max(5000) });

const author = { author: { select: { id: true, name: true } } };

// Rutas anidadas: /patients/:id/quick-notes
const patientRouter = Router({ mergeParams: true });
patientRouter.use(requireAuth);

patientRouter.get(
  '/',
  asyncH(async (req, res) => {
    const notes = await prisma.quickNote.findMany({
      where: { patientId: req.params.id! },
      orderBy: { createdAt: 'desc' },
      include: author,
    });
    res.json(notes);
  }),
);

patientRouter.post(
  '/',
  requireRole('ADMIN', 'DENTIST'),
  validate(bodySchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const note = await prisma.quickNote.create({
      data: { patientId: req.params.id!, authorId: req.user.sub, body: (req.body as { body: string }).body },
      include: author,
    });
    await logAudit({ actorId: req.user.sub, action: 'CREATE', entity: 'QuickNote', entityId: note.id });
    res.status(201).json(note);
  }),
);

// Rutas a nivel de nota: /quick-notes/:id
const router = Router();
router.use(requireAuth);

router.patch(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  validate(bodySchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    try {
      const note = await prisma.quickNote.update({
        where: { id: req.params.id! },
        data: { body: (req.body as { body: string }).body },
        include: author,
      });
      await logAudit({ actorId: req.user.sub, action: 'UPDATE', entity: 'QuickNote', entityId: req.params.id! });
      res.json(note);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new HttpError(404, 'Nota no encontrada');
      }
      throw err;
    }
  }),
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    try {
      await prisma.quickNote.delete({ where: { id: req.params.id! } });
      await logAudit({ actorId: req.user.sub, action: 'DELETE', entity: 'QuickNote', entityId: req.params.id! });
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new HttpError(404, 'Nota no encontrada');
      }
      throw err;
    }
  }),
);

export { patientRouter as patientQuickNotesRouter, router as quickNotesRouter };
