import { z } from 'zod';

export const createNoteSchema = z.object({
  appointmentId: z.string().optional().nullable(),
  visitDate: z.string().datetime({ offset: true }).optional().nullable(),
  procedure: z.string().trim().max(200).optional().nullable(),
  diagnosis: z.string().trim().max(1000).optional().nullable(),
  treatment: z.string().trim().max(2000).optional().nullable(),
  observations: z.string().trim().max(4000).optional().nullable(),
});

export const updateNoteSchema = createNoteSchema.partial();

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
