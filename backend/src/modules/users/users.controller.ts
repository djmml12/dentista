import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/error.js';
import { listUsers, createUser, updateUser, resetUserPassword } from './users.service.js';

export async function list(_req: Request, res: Response) {
  const users = await listUsers();
  res.json({ users });
}

export async function create(req: Request, res: Response) {
  const user = await createUser(req.body as Parameters<typeof createUser>[0]);
  res.status(201).json({ user });
}

export async function update(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const { id } = req.params as { id: string };
  const user = await updateUser(id, req.user.sub, req.body as Parameters<typeof updateUser>[2]);
  res.json({ user });
}

export async function resetPassword(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const { password } = req.body as { password: string };
  await resetUserPassword(id, password);
  res.json({ ok: true });
}
