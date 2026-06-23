import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';

// ─── Catálogo ────────────────────────────────────────────────────────────────

export async function listBillableItems() {
  const items = await prisma.billableItem.findMany({
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });
  return items.map(serializeItem);
}

export async function createBillableItem(data: {
  name: string;
  description?: string;
  type: 'SERVICE' | 'PRODUCT' | 'SUPPLY';
  price: number;
}) {
  const item = await prisma.billableItem.create({ data });
  return serializeItem(item);
}

export async function updateBillableItem(
  id: string,
  data: { name?: string; description?: string; type?: 'SERVICE' | 'PRODUCT' | 'SUPPLY'; price?: number; isActive?: boolean },
) {
  const item = await prisma.billableItem.findUnique({ where: { id } });
  if (!item) throw new HttpError(404, 'Artículo no encontrado');
  const updated = await prisma.billableItem.update({ where: { id }, data });
  return serializeItem(updated);
}

// ─── Recibos ─────────────────────────────────────────────────────────────────

type ItemInput = {
  billableItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  order?: number;
};

const receiptInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  items: { orderBy: { order: 'asc' as const } },
} as const;

function serializeItem(item: { id: string; name: string; description: string | null; type: string; price: { toString(): string }; isActive: boolean; createdAt: Date; updatedAt: Date }) {
  return { ...item, price: Number(item.price) };
}

function serializeReceipt(r: {
  id: string;
  patientId: string;
  createdById: string;
  status: string;
  notes: string | null;
  issuedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  patient: { id: string; firstName: string; lastName: string; email: string | null };
  createdBy: { id: string; name: string };
  items: Array<{ id: string; receiptId: string; billableItemId: string | null; description: string; quantity: number; unitPrice: { toString(): string }; order: number }>;
}) {
  return {
    ...r,
    items: r.items.map((it) => ({ ...it, unitPrice: Number(it.unitPrice) })),
  };
}

export async function listReceipts(filters: { patientId?: string; status?: string } = {}) {
  const where: Record<string, unknown> = {};
  if (filters.patientId) where.patientId = filters.patientId;
  if (filters.status) where.status = filters.status;

  const receipts = await prisma.receipt.findMany({
    where,
    include: receiptInclude,
    orderBy: { createdAt: 'desc' },
  });
  return receipts.map(serializeReceipt);
}

export async function getReceipt(id: string) {
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: receiptInclude });
  if (!receipt) throw new HttpError(404, 'Recibo no encontrado');
  return serializeReceipt(receipt);
}

export async function createReceipt(actorId: string, data: {
  patientId: string;
  notes?: string;
  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  items: ItemInput[];
}) {
  const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');

  const receipt = await prisma.receipt.create({
    data: {
      patientId: data.patientId,
      createdById: actorId,
      notes: data.notes,
      status: data.status ?? 'DRAFT',
      items: {
        create: data.items.map((it, idx) => ({
          billableItemId: it.billableItemId,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          order: it.order ?? idx,
        })),
      },
    },
    include: receiptInclude,
  });
  return serializeReceipt(receipt);
}

export async function updateReceipt(id: string, data: {
  notes?: string | null;
  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  items?: ItemInput[];
}) {
  const existing = await prisma.receipt.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Recibo no encontrado');

  const updateData: Record<string, unknown> = {};
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;

  if (data.items !== undefined) {
    await prisma.receiptItem.deleteMany({ where: { receiptId: id } });
    updateData.items = {
      create: data.items.map((it, idx) => ({
        billableItemId: it.billableItemId,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        order: it.order ?? idx,
      })),
    };
  }

  const receipt = await prisma.receipt.update({
    where: { id },
    data: updateData,
    include: receiptInclude,
  });
  return serializeReceipt(receipt);
}

// ─── Email ────────────────────────────────────────────────────────────────────

export async function sendReceiptEmail(id: string) {
  const receipt = await getReceipt(id);
  if (!receipt.patient.email) {
    throw new HttpError(422, 'El paciente no tiene correo electrónico registrado');
  }

  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.user || !cfg.pass) {
    throw new HttpError(422, 'Configuración SMTP incompleta');
  }
  if (!cfg.enabled) {
    throw new HttpError(422, 'El envío de correos está desactivado en la configuración');
  }

  const nodemailer = await import('nodemailer');
  const transport = nodemailer.default.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  const fecha = receipt.issuedAt.toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const total = receipt.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const fmt = (n: number) => n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });

  const itemsHtml = receipt.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${it.description}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${it.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(it.unitPrice)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${fmt(it.quantity * it.unitPrice)}</td>
      </tr>`,
    )
    .join('');

  const patientName = `${receipt.patient.firstName} ${receipt.patient.lastName}`;

  await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
    to: receipt.patient.email,
    subject: `Recibo de pago – ${fecha}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333">
        <div style="background:#0d9488;padding:24px 32px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Recibo de pago</h1>
          <p style="color:#99f6e4;margin:4px 0 0">${cfg.fromName}</p>
        </div>
        <div style="padding:24px 32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
          <p>Estimado/a <strong>${patientName}</strong>,</p>
          <p>A continuación encontrará el detalle de su recibo emitido el <strong>${fecha}</strong>:</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
            <thead>
              <tr style="background:#f9fafb">
                <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600">Descripción</th>
                <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600">Cant.</th>
                <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600">P. unitario</th>
                <th style="padding:10px 12px;text-align:right;color:#6b7280;font-weight:600">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div style="text-align:right;margin-top:8px;padding:12px 12px;background:#f0fdf4;border-radius:8px">
            <span style="font-size:16px;font-weight:700;color:#0d9488">TOTAL: ${fmt(total)}</span>
          </div>

          ${receipt.notes ? `<p style="margin-top:16px;color:#6b7280;font-size:13px"><strong>Notas:</strong> ${receipt.notes}</p>` : ''}

          <p style="color:#9ca3af;font-size:12px;margin-top:24px">${cfg.fromName}</p>
        </div>
      </div>`,
  });
}
