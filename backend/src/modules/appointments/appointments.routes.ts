import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  listAppointmentsQuerySchema,
} from './appointments.schema.js';
import * as ctrl from './appointments.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate(listAppointmentsQuerySchema, 'query'), asyncH(ctrl.list));
router.post('/', validate(createAppointmentSchema), asyncH(ctrl.create));
router.get('/:id', asyncH(ctrl.getOne));
router.patch('/:id', validate(updateAppointmentSchema), asyncH(ctrl.update));
router.delete('/:id', asyncH(ctrl.remove));

export default router;
