import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { validate } from '../../middleware/validate.js';
import { asyncH } from '../../lib/async.js';
import { HttpError } from '../../middleware/error.js';
import { logAudit } from '../audit/audit.service.js';
import { createPrescriptionSchema, updatePrescriptionSchema } from './prescriptions.schema.js';
import * as svc from './prescriptions.service.js';
import { sendPrescriptionEmailDirect } from '../email/email.service.js';

// Rutas anidadas bajo /patients/:id/prescriptions
const patientRouter = Router({ mergeParams: true });
patientRouter.use(requireAuth);

patientRouter.get(
  '/',
  asyncH(async (req, res) => {
    res.json(await svc.listPrescriptions(req.params.id!));
  }),
);

patientRouter.post(
  '/',
  requireRole('ADMIN', 'DENTIST'),
  validate(createPrescriptionSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const prescription = await svc.createPrescription(req.params.id!, req.user.sub, req.body);
    await logAudit({ actorId: req.user.sub, action: 'CREATE', entity: 'Prescription', entityId: prescription.id });
    res.status(201).json(prescription);
  }),
);

// Rutas a nivel de receta: /prescriptions/:id
const router = Router();
router.use(requireAuth);

router.get(
  '/:id',
  asyncH(async (req, res) => {
    res.json(await svc.getPrescription(req.params.id!));
  }),
);

router.patch(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  validate(updatePrescriptionSchema),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    const updated = await svc.updatePrescription(req.params.id!, req.body);
    await logAudit({ actorId: req.user.sub, action: 'UPDATE', entity: 'Prescription', entityId: req.params.id! });
    res.json(updated);
  }),
);

router.delete(
  '/:id',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    if (!req.user) throw new HttpError(401, 'No autenticado');
    await svc.deletePrescription(req.params.id!);
    await logAudit({ actorId: req.user.sub, action: 'DELETE', entity: 'Prescription', entityId: req.params.id! });
    res.status(204).end();
  }),
);

router.post(
  '/:id/email',
  requireRole('ADMIN', 'DENTIST'),
  asyncH(async (req, res) => {
    const rx = await svc.getPrescription(req.params.id!);
    await sendPrescriptionEmailDirect({
      patientEmail: rx.patient.email,
      patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
      prescriberName: rx.prescriber.name,
      prescriberLicense: rx.prescriber.licenseNumber,
      prescriberSpecialty: rx.prescriber.specialty,
      issuedAt: rx.issuedAt,
      diagnosis: rx.diagnosis,
      items: rx.items,
    });
    res.json({ ok: true });
  }),
);

export { patientRouter as patientPrescriptionsRouter, router as prescriptionsRouter };
