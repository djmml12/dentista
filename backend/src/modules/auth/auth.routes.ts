import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { asyncH } from '../../lib/async.js';
import { loginSchema, updateProfileSchema } from './auth.schema.js';
import { login, refresh, logout, me, updateProfile } from './auth.controller.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' },
});

router.post('/login', loginLimiter, validate(loginSchema), asyncH(login));
router.post('/refresh', asyncH(refresh));
router.post('/logout', asyncH(logout));
router.get('/me', requireAuth, asyncH(me));
router.patch('/me', requireAuth, validate(updateProfileSchema), asyncH(updateProfile));

export default router;
