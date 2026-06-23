import type { Request, Response, NextFunction } from 'express';
import type { Role } from '@prisma/client';

export function requireRole(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permiso insuficiente' });
    }
    return next();
  };
}
