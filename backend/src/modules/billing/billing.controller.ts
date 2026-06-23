import type { Request, Response } from 'express';
import { HttpError } from '../../middleware/error.js';
import {
  listBillableItems, createBillableItem, updateBillableItem,
  listReceipts, getReceipt, createReceipt, updateReceipt, sendReceiptEmail,
} from './billing.service.js';

// ─── Catálogo ────────────────────────────────────────────────────────────────

export async function listItems(_req: Request, res: Response) {
  res.json({ items: await listBillableItems() });
}

export async function createItem(req: Request, res: Response) {
  const item = await createBillableItem(req.body as Parameters<typeof createBillableItem>[0]);
  res.status(201).json({ item });
}

export async function updateItem(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const item = await updateBillableItem(id, req.body as Parameters<typeof updateBillableItem>[1]);
  res.json({ item });
}

// ─── Recibos ─────────────────────────────────────────────────────────────────

export async function listReceiptsCtrl(req: Request, res: Response) {
  const { patientId, status } = req.query as { patientId?: string; status?: string };
  res.json({ receipts: await listReceipts({ patientId, status }) });
}

export async function getReceiptCtrl(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  res.json({ receipt: await getReceipt(id) });
}

export async function createReceiptCtrl(req: Request, res: Response) {
  if (!req.user) throw new HttpError(401, 'No autenticado');
  const receipt = await createReceipt(req.user.sub, req.body as Parameters<typeof createReceipt>[1]);
  res.status(201).json({ receipt });
}

export async function updateReceiptCtrl(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  const receipt = await updateReceipt(id, req.body as Parameters<typeof updateReceipt>[1]);
  res.json({ receipt });
}

export async function sendEmailCtrl(req: Request, res: Response) {
  const { id } = req.params as { id: string };
  await sendReceiptEmail(id);
  res.json({ ok: true });
}
