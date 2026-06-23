import type { Request, Response } from 'express';
import * as svc from './patients.service.js';
import { logAudit } from '../audit/audit.service.js';
import { HttpError } from '../../middleware/error.js';

function actorId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user.sub;
}

export async function list(req: Request, res: Response) {
  const { q, page, pageSize } = req.query as unknown as { q?: string; page: number; pageSize: number };
  res.json(await svc.listPatients({ q, page, pageSize }));
}

export async function create(req: Request, res: Response) {
  const patient = await svc.createPatient(req.body);
  await logAudit({ actorId: actorId(req), action: 'CREATE', entity: 'Patient', entityId: patient.id });
  res.status(201).json(patient);
}

export async function getOne(req: Request, res: Response) {
  res.json(await svc.getPatient(req.params.id!));
}

export async function update(req: Request, res: Response) {
  const id = req.params.id!;
  const patient = await svc.updatePatient(id, req.body);
  // Registramos solo qué campos cambiaron, no los valores (evita duplicar PII en el audit log).
  const changedFields = Object.keys(req.body as Record<string, unknown>);
  await logAudit({
    actorId: actorId(req),
    action: 'UPDATE',
    entity: 'Patient',
    entityId: id,
    metadata: { changedFields },
  });
  res.json(patient);
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id!;
  await svc.deletePatient(id);
  await logAudit({ actorId: actorId(req), action: 'DELETE', entity: 'Patient', entityId: id });
  res.status(204).end();
}

export async function summary(req: Request, res: Response) {
  res.json(await svc.getSummary(req.params.id!));
}

export async function getHistory(req: Request, res: Response) {
  res.json(await svc.getMedicalHistory(req.params.id!));
}

export async function putHistory(req: Request, res: Response) {
  const id = req.params.id!;
  const history = await svc.upsertMedicalHistory(id, req.body);
  await logAudit({ actorId: actorId(req), action: 'UPDATE', entity: 'MedicalHistory', entityId: history.id });
  res.json(history);
}

export async function requestPhotoUpload(req: Request, res: Response) {
  const { contentType } = req.body as { contentType: string };
  if (!contentType || !['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
    res.status(400).json({ error: 'Tipo de imagen no soportado (jpeg, png, webp)' });
    return;
  }
  res.json(await svc.requestPhotoUpload(req.params.id!, contentType));
}

export async function confirmPhoto(req: Request, res: Response) {
  const { key } = req.body as { key: string };
  if (!key || typeof key !== 'string') {
    res.status(400).json({ error: 'Se requiere el campo key' });
    return;
  }
  const patient = await svc.confirmPhoto(req.params.id!, key);
  await logAudit({ actorId: actorId(req), action: 'UPDATE', entity: 'Patient', entityId: req.params.id!, metadata: { field: 'photo' } });
  res.json(patient);
}

export async function deletePhoto(req: Request, res: Response) {
  await svc.deletePhoto(req.params.id!);
  await logAudit({ actorId: actorId(req), action: 'UPDATE', entity: 'Patient', entityId: req.params.id!, metadata: { field: 'photo', action: 'deleted' } });
  res.status(204).end();
}
