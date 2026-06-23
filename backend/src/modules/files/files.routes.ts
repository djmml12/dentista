import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';
import { deleteObject, presignDownload, presignUpload, statObject } from '../../lib/storage.js';
import { signUploadToken, verifyUploadToken } from '../../lib/jwt.js';
import { HttpError } from '../../middleware/error.js';
import { logAudit } from '../audit/audit.service.js';
import { confirmSchema, listFilesQuerySchema, presignSchema, SIZE_LIMITS } from './files.schema.js';

const router = Router();
router.use(requireAuth);

router.post(
  '/presign',
  validate(presignSchema),
  asyncH(async (req, res) => {
    const { patientId, type, fileName, mimeType, sizeBytes } = req.body as {
      patientId: string;
      type: keyof typeof SIZE_LIMITS;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    };
    const limit = SIZE_LIMITS[type];
    if (sizeBytes > limit) {
      throw new HttpError(413, `Archivo demasiado grande (máx ${Math.round(limit / 1024 / 1024)} MB)`);
    }
    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) throw new HttpError(404, 'Paciente no encontrado');
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';
    const storageKey = `patients/${patientId}/${type.toLowerCase()}/${randomUUID()}${ext ? '.' + ext : ''}`;
    const uploadUrl = await presignUpload(storageKey, mimeType, 600);
    const uploadToken = signUploadToken({ patientId, type, storageKey });
    res.json({ uploadUrl, storageKey, uploadToken });
  }),
);

router.post(
  '/confirm',
  validate(confirmSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const body = req.body as {
      uploadToken: string;
      fileName: string;
      mimeType: string;
      description?: string | null;
      takenAt?: string | null;
    };

    // Fuente de verdad: el token firmado en /presign, no el cliente.
    let claim;
    try {
      claim = verifyUploadToken(body.uploadToken);
    } catch {
      throw new HttpError(400, 'Token de subida inválido o expirado');
    }
    const type = claim.type as keyof typeof SIZE_LIMITS;

    // Verificamos que el objeto realmente se subió y obtenemos su tamaño real.
    const stat = await statObject(claim.storageKey);
    if (!stat) throw new HttpError(409, 'El archivo no se encontró en el almacenamiento');
    if (stat.sizeBytes > SIZE_LIMITS[type]) {
      await deleteObject(claim.storageKey).catch(() => {});
      throw new HttpError(413, 'El archivo subido supera el tamaño permitido');
    }

    const file = await prisma.mediaFile.create({
      data: {
        patientId: claim.patientId,
        uploadedById: req.user.sub,
        type: type as never,
        fileName: body.fileName,
        mimeType: stat.contentType ?? body.mimeType,
        sizeBytes: stat.sizeBytes,
        storageKey: claim.storageKey,
        description: body.description ?? null,
        takenAt: body.takenAt ? new Date(body.takenAt) : null,
      },
    });
    await logAudit({ actorId: req.user.sub, action: 'CREATE', entity: 'MediaFile', entityId: file.id });
    res.status(201).json(file);
  }),
);

router.get(
  '/:id/download-url',
  asyncH(async (req, res) => {
    const file = await prisma.mediaFile.findUnique({ where: { id: req.params.id! } });
    if (!file) throw new HttpError(404, 'Archivo no encontrado');
    const url = await presignDownload(file.storageKey, 300);
    res.json({ url, file });
  }),
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const id = req.params.id!;
    const file = await prisma.mediaFile.findUnique({ where: { id } });
    if (!file) throw new HttpError(404, 'Archivo no encontrado');
    try {
      await deleteObject(file.storageKey);
    } catch (err) {
      console.error('storage delete failed', err);
    }
    try {
      await prisma.mediaFile.delete({ where: { id } });
      await logAudit({ actorId: req.user.sub, action: 'DELETE', entity: 'MediaFile', entityId: id });
      res.status(204).end();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new HttpError(404, 'Archivo no encontrado');
      }
      throw err;
    }
  }),
);

const patientFiles = Router({ mergeParams: true });
patientFiles.use(requireAuth);
patientFiles.get(
  '/',
  validate(listFilesQuerySchema, 'query'),
  asyncH(async (req, res) => {
    const patientId = req.params.id!;
    const type = (req.query.type as string | undefined) || undefined;
    const files = await prisma.mediaFile.findMany({
      where: { patientId, ...(type ? { type: type as never } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(files);
  }),
);

export { router as filesRouter, patientFiles as patientFilesRouter };
