import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export async function listUsers() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { name: 'asc' },
  });
}

export async function createUser(data: {
  username: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'ASSISTANT';
}) {
  const existing = await prisma.user.findUnique({ where: { username: data.username } });
  if (existing) throw new HttpError(409, 'El nombre de usuario ya está en uso');
  const passwordHash = await argon2.hash(data.password);
  return prisma.user.create({
    data: { username: data.username, passwordHash, name: data.name, role: data.role },
    select: userSelect,
  });
}

export async function updateUser(
  id: string,
  actorId: string,
  data: { name?: string; role?: 'ADMIN' | 'ASSISTANT'; isActive?: boolean },
) {
  if (id === actorId && (data.role !== undefined || data.isActive === false)) {
    throw new HttpError(403, 'No puedes cambiar tu propio rol ni desactivar tu cuenta');
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

export async function resetUserPassword(id: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  const passwordHash = await argon2.hash(password);
  await prisma.user.update({
    where: { id },
    data: { passwordHash, tokenVersion: { increment: 1 } },
  });
}
