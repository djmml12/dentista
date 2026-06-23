import { z } from 'zod';

export const upsertEmailConfigSchema = z.object({
  enabled: z.boolean(),
  host: z.string().min(1, 'El servidor SMTP es obligatorio'),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  user: z.string().min(1, 'El usuario es obligatorio'),
  pass: z.string().optional(),
  fromName: z.string().min(1, 'El nombre del remitente es obligatorio'),
  fromEmail: z.string().email('Correo del remitente inválido').or(z.literal('')),
  notifyAppointment: z.boolean(),
  notifyPrescription: z.boolean(),
  reminderHoursBefore: z.array(z.coerce.number().int().min(1).max(168)).default([]),
});

export const testEmailSchema = z.object({
  to: z.string().email('Correo de destino inválido'),
});

export type UpsertEmailConfigInput = z.infer<typeof upsertEmailConfigSchema>;
export type TestEmailInput = z.infer<typeof testEmailSchema>;
