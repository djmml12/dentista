import { z } from 'zod';

export const prescriptionItemSchema = z.object({
  drugName: z.string().trim().min(1).max(200),
  presentation: z.string().trim().max(160).optional().nullable(),
  dose: z.string().trim().max(160).optional().nullable(),
  frequency: z.string().trim().max(160).optional().nullable(),
  duration: z.string().trim().max(160).optional().nullable(),
  quantity: z.string().trim().max(160).optional().nullable(),
  instructions: z.string().trim().max(500).optional().nullable(),
});

export const createPrescriptionSchema = z.object({
  prescriberId: z.string().min(1).optional(), // por defecto, el usuario actual
  issuedAt: z.string().datetime({ offset: true }).optional(),
  diagnosis: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1).max(30),
});

export const updatePrescriptionSchema = z.object({
  prescriberId: z.string().min(1).optional(),
  issuedAt: z.string().datetime({ offset: true }).optional(),
  diagnosis: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  items: z.array(prescriptionItemSchema).min(1).max(30).optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
