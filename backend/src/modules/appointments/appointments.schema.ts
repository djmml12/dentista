import { z } from 'zod';

export const STATUSES = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

export const createAppointmentSchema = z
  .object({
    patientId: z.string().min(1),
    dentistId: z.string().min(1),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().max(200).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(STATUSES).optional(),
  })
  .refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
    message: 'La hora de fin debe ser posterior al inicio',
    path: ['endsAt'],
  });

export const updateAppointmentSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    dentistId: z.string().min(1).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
    endsAt: z.string().datetime({ offset: true }).optional(),
    reason: z.string().trim().max(200).optional().nullable(),
    notes: z.string().trim().max(2000).optional().nullable(),
    status: z.enum(STATUSES).optional(),
  })
  .refine(
    (d) => !(d.startsAt && d.endsAt) || new Date(d.endsAt) > new Date(d.startsAt),
    { message: 'La hora de fin debe ser posterior al inicio', path: ['endsAt'] },
  );

export const listAppointmentsQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
  dentistId: z.string().optional(),
  patientId: z.string().optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
