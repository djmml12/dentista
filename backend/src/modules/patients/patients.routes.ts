import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import {
  createPatientSchema,
  updatePatientSchema,
  listPatientsQuerySchema,
  medicalHistorySchema,
} from './patients.schema.js';
import * as ctrl from './patients.controller.js';
import { patientNotesRouter } from '../clinical-notes/notes.routes.js';
import odontogramRouter from '../odontogram/odontogram.routes.js';
import { patientFilesRouter } from '../files/files.routes.js';
import { patientPrescriptionsRouter } from '../prescriptions/prescriptions.routes.js';
import { patientQuickNotesRouter } from '../quick-notes/quick-notes.routes.js';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listPatientsQuerySchema, 'query'), asyncH(ctrl.list));
router.post('/', validate(createPatientSchema), asyncH(ctrl.create));
router.get('/:id', asyncH(ctrl.getOne));
router.patch('/:id', validate(updatePatientSchema), asyncH(ctrl.update));
router.delete('/:id', requireRole('ADMIN', 'DENTIST'), asyncH(ctrl.remove));

router.get('/:id/summary', asyncH(ctrl.summary));
router.get('/:id/medical-history', asyncH(ctrl.getHistory));
router.put('/:id/medical-history', requireRole('ADMIN', 'DENTIST'), validate(medicalHistorySchema), asyncH(ctrl.putHistory));

router.post('/:id/photo', asyncH(ctrl.requestPhotoUpload));
router.patch('/:id/photo', asyncH(ctrl.confirmPhoto));
router.delete('/:id/photo', asyncH(ctrl.deletePhoto));

router.use('/:id/clinical-notes', patientNotesRouter);
router.use('/:id/odontogram', odontogramRouter);
router.use('/:id/files', patientFilesRouter);
router.use('/:id/prescriptions', patientPrescriptionsRouter);
router.use('/:id/quick-notes', patientQuickNotesRouter);

export default router;
