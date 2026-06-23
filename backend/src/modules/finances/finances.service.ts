import { prisma } from '../../lib/prisma.js';

function monthBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

function sumItems(items: Array<{ quantity: number; unitPrice: { toString(): string } | number }>) {
  return items.reduce((s, it) => s + it.quantity * Number(it.unitPrice), 0);
}

export async function getFinancialSummary(year: number, month: number) {
  const { start: monthStart, end: monthEnd } = monthBounds(year, month);

  // ── Recibos del mes seleccionado ─────────────────────────────────────────
  const monthReceipts = await prisma.receipt.findMany({
    where: {
      issuedAt: { gte: monthStart, lte: monthEnd },
      status: { in: ['PAID', 'ISSUED', 'DRAFT'] },
    },
    include: { items: true },
  });

  const paidReceipts = monthReceipts.filter((r) => r.status === 'PAID');
  const issuedReceipts = monthReceipts.filter((r) => r.status === 'ISSUED');
  const draftReceipts = monthReceipts.filter((r) => r.status === 'DRAFT');

  const collected = paidReceipts.reduce((s, r) => s + sumItems(r.items), 0);
  const pending = issuedReceipts.reduce((s, r) => s + sumItems(r.items), 0);
  const draft = draftReceipts.reduce((s, r) => s + sumItems(r.items), 0);

  // ── Últimos 6 meses (terminando en el mes seleccionado) ──────────────────
  const sixMonthsStart = new Date(year, month - 7, 1);
  const allPeriodReceipts = await prisma.receipt.findMany({
    where: {
      issuedAt: { gte: sixMonthsStart, lte: monthEnd },
      status: { in: ['PAID', 'ISSUED'] },
    },
    include: { items: true },
  });

  const lastSixMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const { start: s, end: e } = monthBounds(y, m);
    const slice = allPeriodReceipts.filter((r) => r.issuedAt >= s && r.issuedAt <= e);
    return {
      month: `${y}-${String(m).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-GT', { month: 'short', year: '2-digit' }),
      collected: slice.filter((r) => r.status === 'PAID').reduce((s2, r) => s2 + sumItems(r.items), 0),
      pending: slice.filter((r) => r.status === 'ISSUED').reduce((s2, r) => s2 + sumItems(r.items), 0),
    };
  });

  // ── Desglose por tipo de artículo (mes seleccionado, recibos PAID) ───────
  const paidItems = await prisma.receiptItem.findMany({
    where: {
      receipt: { status: 'PAID', issuedAt: { gte: monthStart, lte: monthEnd } },
    },
    include: { billableItem: { select: { type: true } } },
  });

  const typeAccum: Record<string, number> = { SERVICE: 0, PRODUCT: 0, SUPPLY: 0, OTHER: 0 };
  for (const it of paidItems) {
    const t = it.billableItem?.type ?? 'OTHER';
    typeAccum[t] = (typeAccum[t] ?? 0) + it.quantity * Number(it.unitPrice);
  }

  const typeLabels: Record<string, string> = {
    SERVICE: 'Servicios',
    PRODUCT: 'Productos',
    SUPPLY: 'Insumos',
    OTHER: 'Otros',
  };

  const byServiceType = Object.entries(typeAccum)
    .filter(([, total]) => total > 0)
    .map(([type, total]) => ({ type, label: typeLabels[type] ?? type, total }));

  // ── Proyección: próximas 4 semanas desde hoy ──────────────────────────────
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const upcoming = await prisma.appointment.findMany({
    where: {
      startsAt: { gte: now, lte: thirtyDaysLater },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    orderBy: { startsAt: 'asc' },
  });

  const avgTicket = paidReceipts.length > 0 ? collected / paidReceipts.length : 0;
  const upcomingCount = upcoming.length;

  const byWeek = Array.from({ length: 4 }, (_, w) => {
    const wStart = new Date(now.getTime() + w * 7 * 24 * 60 * 60 * 1000);
    const wEnd = new Date(wStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    const count = upcoming.filter((a) => a.startsAt >= wStart && a.startsAt <= wEnd).length;
    const fmt = (d: Date) => d.toLocaleDateString('es-GT', { day: 'numeric', month: 'short' });
    return {
      label: `${fmt(wStart)} – ${fmt(wEnd)}`,
      appointments: count,
      estimated: count * avgTicket,
    };
  });

  // ── Recibos recientes ─────────────────────────────────────────────────────
  const recentReceipts = await prisma.receipt.findMany({
    where: { status: { in: ['PAID', 'ISSUED', 'CANCELLED'] } },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      items: true,
    },
    orderBy: { issuedAt: 'desc' },
    take: 8,
  });

  return {
    currentMonth: { collected, pending, draft },
    lastSixMonths,
    byServiceType,
    projection: {
      upcomingCount,
      avgTicket,
      estimatedTotal: upcomingCount * avgTicket,
      byWeek,
      hasData: paidReceipts.length > 0,
    },
    recentReceipts: recentReceipts.map((r) => ({
      id: r.id,
      patientId: r.patient.id,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`,
      status: r.status,
      issuedAt: r.issuedAt,
      total: sumItems(r.items),
    })),
  };
}
