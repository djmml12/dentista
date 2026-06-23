import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    req.user = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
