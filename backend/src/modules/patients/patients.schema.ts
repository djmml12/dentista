import { z } from 'zod';

const optionalString = z.string().trim().min(1).optional().nullable();
const isoDate = z.string().datetime({ offset: true }).optional().nullable();

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  documentId: optionalString,
  birthDate: isoDate,
  sex: optionalString,
  phone: optionalString,
  email: z.string().email().optional().nullable(),
  address: optionalString,
  emergencyContactName: optionalString,
  emergencyContactPhone: optionalString,
  notes: z.string().max(2000).optional().nullable(),
});

export const updatePatientSchema = createPatientSchema.partial();

export const listPatientsQuerySchema = z.object({
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const medicalHistorySchema = z.object({
  allergies: z.array(z.string().trim().min(1)).default([]),
  chronicConditions: z.array(z.string().trim().min(1)).default([]),
  currentMedications: z.array(z.string().trim().min(1)).default([]),
  isPregnant: z.boolean().default(false),
  isSmoker: z.boolean().default(false),
  isDiabetic: z.boolean().default(false),
  bloodType: z.string().trim().max(5).optional().nullable(),
  freeText: z.string().max(4000).optional().nullable(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type MedicalHistoryInput = z.infer<typeof medicalHistorySchema>;
