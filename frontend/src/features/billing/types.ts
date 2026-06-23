export type BillableType = 'SERVICE' | 'PRODUCT' | 'SUPPLY';
export type ReceiptStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';

export interface BillableItem {
  id: string;
  name: string;
  description: string | null;
  type: BillableType;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptItem {
  id: string;
  receiptId: string;
  billableItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  order: number;
}

export interface Receipt {
  id: string;
  patientId: string;
  createdById: string;
  status: ReceiptStatus;
  notes: string | null;
  issuedAt: string;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; firstName: string; lastName: string; email: string | null };
  createdBy: { id: string; name: string };
  items: ReceiptItem[];
}

export interface DraftItem {
  tempId: string;
  billableItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}
