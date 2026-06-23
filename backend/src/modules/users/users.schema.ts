import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string().min(3).max(60).regex(/^[a-z0-9_.-]+$/, 'Solo letras minúsculas, números, punto, guión y guión bajo'),
  password: z.string().min(6).max(100),
  name: z.string().min(1).max(120),
  role: z.enum(['ADMIN', 'ASSISTANT']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  role: z.enum(['ADMIN', 'ASSISTANT']).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(6).max(100),
});
