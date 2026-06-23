import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  licenseNumber: z.string().trim().max(60).optional().nullable(),
  specialty: z.string().trim().max(120).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
