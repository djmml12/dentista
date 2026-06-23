import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/rbac.js';
import { asyncH } from '../../lib/async.js';
import { validate } from '../../middleware/validate.js';
import { createBillableItemSchema, updateBillableItemSchema, createReceiptSchema, updateReceiptSchema } from './billing.schema.js';
import {
  listItems, createItem, updateItem,
  listReceiptsCtrl, getReceiptCtrl, createReceiptCtrl, updateReceiptCtrl, sendEmailCtrl,
} from './billing.controller.js';

const router = Router();
router.use(requireAuth);

// Catálogo — lectura para todos, escritura solo ADMIN
router.get('/items', asyncH(listItems));
router.post('/items', requireRole('ADMIN'), validate(createBillableItemSchema), asyncH(createItem));
router.patch('/items/:id', requireRole('ADMIN'), validate(updateBillableItemSchema), asyncH(updateItem));

// Recibos — todos los roles autenticados
router.get('/receipts', asyncH(listReceiptsCtrl));
router.post('/receipts', validate(createReceiptSchema), asyncH(createReceiptCtrl));
router.get('/receipts/:id', asyncH(getReceiptCtrl));
router.patch('/receipts/:id', validate(updateReceiptSchema), asyncH(updateReceiptCtrl));
router.post('/receipts/:id/send-email', asyncH(sendEmailCtrl));

export default router;
