import type { Request, Response } from 'express';
import { authenticate, issueTokens } from './auth.service.js';
import { verifyRefreshToken } from '../../lib/jwt.js';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { HttpError } from '../../middleware/error.js';

const REFRESH_COOKIE = 'dental_rt';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: 'ADMIN' | 'DENTIST' | 'ASSISTANT';
  licenseNumber: string | null;
  specialty: string | null;
}

function publicUser(u: UserRow) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    licenseNumber: u.licenseNumber,
    specialty: u.specialty,
  };
}

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
}

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as { username: string; password: string };
  const user = await authenticate(username, password);
  const { accessToken, refreshToken } = issueTokens(user);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user: publicUser(user) });
}

export async function refresh(req: Request, res: Response) {
  const token = (req.cookies as Record<string, string | undefined>)?.[REFRESH_COOKIE];
  if (!token) throw new HttpError(401, 'Sin refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, 'Refresh token inválido');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new HttpError(401, 'Usuario no disponible');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new HttpError(401, 'Sesión revocada');
  }

  const { accessToken, refreshToken } = issueTokens(user);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken, user: publicUser(user) });
}

export async function logout(req: Request, res: Response) {
  // Invalidamos todos los refresh tokens del usuario incrementando su tokenVersion.
  const token = (req.cookies as Record<string, string | undefined>)?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await prisma.user.update({
        where: { id: payload.sub },
        data: { tokenVersion: { increment: 1 } },
      });
    } catch {
      // token inválido/expirado: nada que revocar
    }
  }
  clearRefreshCookie(res);
  res.json({ ok: true });
}

const profileSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  licenseNumber: true,
  specialty: true,
  isActive: true,
} as const;

export async function me(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const user = await prisma.user.findUnique({ where: { id: req.user.sub }, select: profileSelect });
  if (!user || !user.isActive) throw new HttpError(401, 'Usuario no disponible');
  res.json({ user: publicUser(user) });
}

export async function updateProfile(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const body = req.body as { name?: string; licenseNumber?: string | null; specialty?: string | null };
  const data: { name?: string; licenseNumber?: string | null; specialty?: string | null } = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.licenseNumber !== undefined) data.licenseNumber = body.licenseNumber || null;
  if (body.specialty !== undefined) data.specialty = body.specialty || null;
  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data,
    select: profileSelect,
  });
  res.json({ user: publicUser(user) });
}
