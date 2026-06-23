import { api } from '@/lib/api';
import type { BillableItem, Receipt } from './types';

type ItemInput = { billableItemId?: string; description: string; quantity: number; unitPrice: number; order?: number };

export const billingApi = {
  // Catálogo
  listItems: () => api<{ items: BillableItem[] }>('/billing/items').then((d) => d.items),

  createItem: (body: { name: string; description?: string; type: string; price: number }) =>
    api<{ item: BillableItem }>('/billing/items', { method: 'POST', body }).then((d) => d.item),

  updateItem: (id: string, body: Partial<{ name: string; description: string; type: string; price: number; isActive: boolean }>) =>
    api<{ item: BillableItem }>(`/billing/items/${id}`, { method: 'PATCH', body }).then((d) => d.item),

  // Recibos
  listReceipts: (params?: { patientId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.patientId) qs.set('patientId', params.patientId);
    if (params?.status) qs.set('status', params.status);
    const q = qs.toString();
    return api<{ receipts: Receipt[] }>(`/billing/receipts${q ? `?${q}` : ''}`).then((d) => d.receipts);
  },

  getReceipt: (id: string) => api<{ receipt: Receipt }>(`/billing/receipts/${id}`).then((d) => d.receipt),

  createReceipt: (body: { patientId: string; notes?: string; status?: string; items: ItemInput[] }) =>
    api<{ receipt: Receipt }>('/billing/receipts', { method: 'POST', body }).then((d) => d.receipt),

  updateReceipt: (id: string, body: { notes?: string | null; status?: string; items?: ItemInput[] }) =>
    api<{ receipt: Receipt }>(`/billing/receipts/${id}`, { method: 'PATCH', body }).then((d) => d.receipt),

  sendEmail: (id: string) => api<{ ok: boolean }>(`/billing/receipts/${id}/send-email`, { method: 'POST' }),
};
