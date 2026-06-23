import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { upsertEmailConfigSchema, testEmailSchema } from './email.schema.js';
import * as ctrl from './email.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncH(ctrl.getConfig));
router.put('/', validate(upsertEmailConfigSchema), asyncH(ctrl.saveConfig));
router.post('/test', validate(testEmailSchema), asyncH(ctrl.testEmail));

export default router;
