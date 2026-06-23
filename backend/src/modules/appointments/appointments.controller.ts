import type { Request, Response } from 'express';
import * as svc from './appointments.service.js';
import { logAudit } from '../audit/audit.service.js';
import { HttpError } from '../../middleware/error.js';

function actorId(req: Request): string {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  return req.user.sub;
}

export async function list(req: Request, res: Response) {
  res.json(await svc.listAppointments(req.query as Record<string, string | undefined>));
}

export async function create(req: Request, res: Response) {
  const a = await svc.createAppointment(req.body);
  await logAudit({ actorId: actorId(req), action: 'CREATE', entity: 'Appointment', entityId: a.id });
  res.status(201).json(a);
}

export async function getOne(req: Request, res: Response) {
  res.json(await svc.getAppointment(req.params.id!));
}

export async function update(req: Request, res: Response) {
  const id = req.params.id!;
  const a = await svc.updateAppointment(id, req.body);
  await logAudit({ actorId: actorId(req), action: 'UPDATE', entity: 'Appointment', entityId: id });
  res.json(a);
}

export async function remove(req: Request, res: Response) {
  const id = req.params.id!;
  await svc.deleteAppointment(id);
  await logAudit({ actorId: actorId(req), action: 'DELETE', entity: 'Appointment', entityId: id });
  res.status(204).end();
}
