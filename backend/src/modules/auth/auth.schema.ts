import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9_.-]+$/, 'Solo letras minúsculas, números, punto, guión y guión bajo'),
  password: z.string().min(6).max(100),
  name: z.string().trim().min(1).max(120),
  recoveryEmail: z.string().email('Correo inválido').max(200).optional().nullable(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  licenseNumber: z.string().trim().max(60).optional().nullable(),
  specialty: z.string().trim().max(120).optional().nullable(),
  recoveryEmail: z.string().email('Correo inválido').max(200).optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
