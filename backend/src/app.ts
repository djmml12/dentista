import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { notesRouter } from './modules/clinical-notes/notes.routes.js';
import { filesRouter } from './modules/files/files.routes.js';
import medicationsRoutes from './modules/medications/medications.routes.js';
import { prescriptionsRouter } from './modules/prescriptions/prescriptions.routes.js';
import { quickNotesRouter } from './modules/quick-notes/quick-notes.routes.js';
import emailRoutes from './modules/email/email.routes.js';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes.js';
import clinicConfigRoutes from './modules/clinic-config/clinic-config.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import financesRoutes from './modules/finances/finances.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'dental-api' }));

  app.use('/auth', authRoutes);
  app.use('/patients', patientsRoutes);
  app.use('/appointments', appointmentsRoutes);
  app.use('/users', usersRoutes);
  app.use('/clinical-notes', notesRouter);
  app.use('/files', filesRouter);
  app.use('/medications', medicationsRoutes);
  app.use('/prescriptions', prescriptionsRouter);
  app.use('/quick-notes', quickNotesRouter);
  app.use('/email-config', emailRoutes);
  app.use('/whatsapp-config', whatsappRoutes);
  app.use('/clinic-config', clinicConfigRoutes);
  app.use('/billing', billingRoutes);
  app.use('/finances', financesRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
