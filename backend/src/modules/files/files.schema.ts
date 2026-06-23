import { z } from 'zod';

export const MEDIA_TYPES = ['RADIOGRAPH_2D', 'DICOM', 'STL_SCAN', 'PHOTO', 'DOCUMENT'] as const;

export const SIZE_LIMITS: Record<(typeof MEDIA_TYPES)[number], number> = {
  RADIOGRAPH_2D: 20 * 1024 * 1024,
  PHOTO: 20 * 1024 * 1024,
  DOCUMENT: 20 * 1024 * 1024,
  STL_SCAN: 100 * 1024 * 1024,
  DICOM: 500 * 1024 * 1024,
};

export const presignSchema = z.object({
  patientId: z.string().min(1),
  type: z.enum(MEDIA_TYPES),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().positive(),
});

export const confirmSchema = z.object({
  // patientId, type, storageKey y sizeBytes ya no se confían al cliente: se derivan del
  // uploadToken firmado en /presign y de un HeadObject contra el storage.
  uploadToken: z.string().min(1),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
  takenAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const listFilesQuerySchema = z.object({
  type: z.enum(MEDIA_TYPES).optional(),
});

export type PresignInput = z.infer<typeof presignSchema>;
export type ConfirmInput = z.infer<typeof confirmSchema>;
