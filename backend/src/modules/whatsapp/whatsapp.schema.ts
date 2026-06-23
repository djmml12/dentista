import { z } from 'zod';

export const upsertWhatsappConfigSchema = z.object({
  enabled: z.boolean(),
  phoneNumberId: z.string().min(1, 'El ID del número de teléfono es obligatorio'),
  accessToken: z.string().optional(),
  notifyAppointment: z.boolean(),
  notifyPrescription: z.boolean(),
  appointmentTemplateName: z.string().min(1, 'El nombre de la plantilla es obligatorio'),
  prescriptionTemplateName: z.string().min(1, 'El nombre de la plantilla es obligatorio'),
  templateLanguage: z.string().min(1, 'El código de idioma es obligatorio'),
});

export const testWhatsappSchema = z.object({
  to: z.string().min(7, 'Número de teléfono inválido'),
});

export type UpsertWhatsappConfigInput = z.infer<typeof upsertWhatsappConfigSchema>;
export type TestWhatsappInput = z.infer<typeof testWhatsappSchema>;
