import { z } from 'zod';

export const createBillableItemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(['SERVICE', 'PRODUCT', 'SUPPLY']),
  price: z.number().min(0).max(9999999),
});

export const updateBillableItemSchema = createBillableItemSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const receiptItemInputSchema = z.object({
  billableItemId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().int().min(1).max(9999),
  unitPrice: z.number().min(0).max(9999999),
  order: z.number().int().min(0).optional(),
});

export const createReceiptSchema = z.object({
  patientId: z.string().cuid(),
  notes: z.string().max(1000).optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']).optional(),
  items: z.array(receiptItemInputSchema).min(1),
});

export const updateReceiptSchema = z.object({
  notes: z.string().max(1000).nullable().optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED']).optional(),
  items: z.array(receiptItemInputSchema).min(1).optional(),
});
