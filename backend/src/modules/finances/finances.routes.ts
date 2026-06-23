import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncH } from '../../lib/async.js';
import { summaryCtrl } from './finances.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/summary', asyncH(summaryCtrl));

export default router;
