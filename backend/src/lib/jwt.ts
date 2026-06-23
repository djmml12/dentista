import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: string;
  username: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const opts: SignOptions = { expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export interface UploadTokenPayload {
  patientId: string;
  type: string;
  storageKey: string;
}

/** Token corto que liga una subida prefirmada a su paciente/tipo/clave de storage. */
export function signUploadToken(payload: UploadTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '30m' });
}

export function verifyUploadToken(token: string): UploadTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as UploadTokenPayload;
}
