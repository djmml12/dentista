import argon2 from 'argon2';
import { prisma } from '../../lib/prisma.js';
import { signAccessToken, signRefreshToken } from '../../lib/jwt.js';
import { HttpError } from '../../middleware/error.js';

export async function authenticate(username: string, password: string) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.isActive) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  const ok = await argon2.verify(user.passwordHash, password);
  if (!ok) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  return user;
}

export function issueTokens(user: {
  id: string;
  username: string;
  role: 'ADMIN' | 'DENTIST' | 'ASSISTANT';
  tokenVersion: number;
}) {
  const accessToken = signAccessToken({ sub: user.id, username: user.username, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, tokenVersion: user.tokenVersion });
  return { accessToken, refreshToken };
}
