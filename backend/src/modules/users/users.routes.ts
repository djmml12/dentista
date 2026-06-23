import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncH } from '../../lib/async.js';
import { prisma } from '../../lib/prisma.js';
import { validate } from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema, resetPasswordSchema } from './users.schema.js';
import { list, create, update, resetPassword } from './users.controller.js';

const router = Router();
router.use(requireAuth);

router.get(
  '/dentists',
  asyncH(async (_req, res) => {
    const dentists = await prisma.user.findMany({
      where: { role: { in: ['DENTIST', 'ADMIN'] }, isActive: true },
      select: { id: true, name: true, username: true, role: true },
      orderBy: { name: 'asc' },
    });
    res.json(dentists);
  }),
);

// Gestión de usuarios (solo ADMIN)
router.get('/', requireRole('ADMIN'), asyncH(list));
router.post('/', requireRole('ADMIN'), validate(createUserSchema), asyncH(create));
router.patch('/:id', requireRole('ADMIN'), validate(updateUserSchema), asyncH(update));
router.post('/:id/reset-password', requireRole('ADMIN'), validate(resetPasswordSchema), asyncH(resetPassword));

export default router;
