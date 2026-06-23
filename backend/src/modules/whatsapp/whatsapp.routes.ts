import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { upsertWhatsappConfigSchema, testWhatsappSchema } from './whatsapp.schema.js';
import * as ctrl from './whatsapp.controller.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', asyncH(ctrl.getConfig));
router.put('/', validate(upsertWhatsappConfigSchema), asyncH(ctrl.saveConfig));
router.post('/test', validate(testWhatsappSchema), asyncH(ctrl.testWhatsapp));

export default router;
