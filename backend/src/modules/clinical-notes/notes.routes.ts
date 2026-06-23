import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { logAudit } from '../audit/audit.service.js';
import { createNoteSchema, updateNoteSchema } from './notes.schema.js';

const noteInclude = {
  author: { select: { id: true, name: true } },
  appointment: { select: { id: true, startsAt: true, reason: true } },
} satisfies Prisma.ClinicalNoteInclude;

const patientRouter = Router({ mergeParams: true });
patientRouter.use(requireAuth);

patientRouter.get(
  '/',
  asyncH(async (req, res) => {
    const notes = await prisma.clinicalNote.findMany({
      where: { patientId: req.params.id! },
      orderBy: { createdAt: 'desc' },
      include: noteInclude,
    });
    res.json(notes);
  }),
);

patientRouter.post(
  '/',
  validate(createNoteSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const body = req.body as Record<string, string | null | undefined>;
    const note = await prisma.clinicalNote.create({
      data: {
        patientId: req.params.id!,
        authorId: req.user.sub,
        appointmentId: body.appointmentId ?? null,
        visitDate: body.visitDate ? new Date(body.visitDate) : null,
        procedure: body.procedure ?? null,
        diagnosis: body.diagnosis ?? null,
        treatment: body.treatment ?? null,
        observations: body.observations ?? null,
      },
      include: noteInclude,
    });
    await logAudit({ actorId: req.user.sub, action: 'CREATE', entity: 'ClinicalNote', entityId: note.id });
    res.status(201).json(note);
  }),
);

const noteRouter = Router();
noteRouter.use(requireAuth);

noteRouter.patch(
  '/:id',
  validate(updateNoteSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const id = req.params.id!;
    const b = req.body as Record<string, string | null | undefined>;
    // Construimos data explícita: solo campos presentes y convirtiendo visitDate a Date.
    const data: Prisma.ClinicalNoteUncheckedUpdateInput = {};
    if (b.appointmentId !== undefined) data.appointmentId = b.appointmentId ?? null;
    if (b.visitDate !== undefined) data.visitDate = b.visitDate ? new Date(b.visitDate) : null;
    if (b.procedure !== undefined) data.procedure = b.procedure ?? null;
    if (b.diagnosis !== undefined) data.diagnosis = b.diagnosis ?? null;
    if (b.treatment !== undefined) data.treatment = b.treatment ?? null;
    if (b.observations !== undefined) data.observations = b.observations ?? null;
    try {
      const note = await prisma.clinicalNote.update({ where: { id }, data, include: noteInclude });
      await logAudit({ actorId: req.user.sub, action: 'UPDATE', entity: 'ClinicalNote', entityId: id });
      res.json(note);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new HttpError(404, 'Nota no encontrada');
      }
      throw err;
    }
  }),
);

noteRouter.delete(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const id = req.params.id!;
    try {
      await prisma.clinicalNote.delete({ where: { id } });
      await logAudit({ actorId: req.user.sub, action: 'DELETE', entity: 'ClinicalNote', entityId: id });
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new HttpError(404, 'Nota no encontrada');
      }
      throw err;
    }
  }),
);

export { patientRouter as patientNotesRouter, noteRouter as notesRouter };
