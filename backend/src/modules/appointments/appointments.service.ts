import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { isValidInterval } from './time.js';
import type { CreateAppointmentInput, UpdateAppointmentInput } from './appointments.schema.js';
import { sendAppointmentEmail } from '../email/email.service.js';
import { sendAppointmentWhatsapp } from '../whatsapp/whatsapp.service.js';

async function assertNoOverlap(params: {
  dentistId: string;
  startsAt: Date;
  endsAt: Date;
  excludeId?: string;
}) {
  const overlap = await prisma.appointment.findFirst({
    where: {
      dentistId: params.dentistId,
      id: params.excludeId ? { not: params.excludeId } : undefined,
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
    },
    select: { id: true, startsAt: true, endsAt: true },
  });
  if (overlap) {
    throw new HttpError(409, 'El dentista ya tiene otra cita en ese horario', { conflictWith: overlap });
  }
}

export async function listAppointments(params: {
  from?: string;
  to?: string;
  dentistId?: string;
  patientId?: string;
}) {
  const where: Prisma.AppointmentWhereInput = {};
  if (params.dentistId) where.dentistId = params.dentistId;
  if (params.patientId) where.patientId = params.patientId;
  if (params.from || params.to) {
    where.startsAt = {};
    if (params.from) (where.startsAt as Prisma.DateTimeFilter).gte = new Date(params.from);
    if (params.to) (where.startsAt as Prisma.DateTimeFilter).lte = new Date(params.to);
  }
  return prisma.appointment.findMany({
    where,
    orderBy: { startsAt: 'asc' },
    // Tope de seguridad: la vista de calendario siempre acota por rango, pero evitamos
    // un escaneo de toda la tabla si se llama sin filtros.
    take: 1000,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentist: { select: { id: true, name: true } },
    },
  });
}

export async function getAppointment(id: string) {
  const a = await prisma.appointment.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      dentist: { select: { id: true, name: true } },
    },
  });
  if (!a) throw new HttpError(404, 'Cita no encontrada');
  return a;
}

export async function createAppointment(input: CreateAppointmentInput) {
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!isValidInterval(startsAt, endsAt)) {
    throw new HttpError(400, 'La hora de fin debe ser posterior al inicio');
  }
  await assertNoOverlap({ dentistId: input.dentistId, startsAt, endsAt });
  const appointment = await prisma.appointment.create({
    data: {
      patientId: input.patientId,
      dentistId: input.dentistId,
      startsAt,
      endsAt,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      status: input.status ?? 'SCHEDULED',
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      dentist: { select: { id: true, name: true } },
    },
  });
  const apptPayload = {
    patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
    dentistName: appointment.dentist.name,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    reason: appointment.reason,
    status: appointment.status,
  };
  sendAppointmentEmail({ patientEmail: appointment.patient.email, ...apptPayload }).catch(() => {});
  sendAppointmentWhatsapp({ patientPhone: appointment.patient.phone, ...apptPayload }).catch(() => {});
  return appointment;
}

export async function updateAppointment(id: string, input: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, 'Cita no encontrada');
  const startsAt = input.startsAt ? new Date(input.startsAt) : existing.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : existing.endsAt;
  const dentistId = input.dentistId ?? existing.dentistId;
  // Validamos coherencia con los valores efectivos (fusionados): el .refine del schema
  // solo cubre el caso en que ambos vienen en el body.
  if (!isValidInterval(startsAt, endsAt)) {
    throw new HttpError(400, 'La hora de fin debe ser posterior al inicio');
  }
  if (input.startsAt || input.endsAt || input.dentistId) {
    await assertNoOverlap({ dentistId, startsAt, endsAt, excludeId: id });
  }
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      patientId: input.patientId ?? existing.patientId,
      dentistId,
      startsAt,
      endsAt,
      reason: input.reason === undefined ? existing.reason : input.reason,
      notes: input.notes === undefined ? existing.notes : input.notes,
      status: input.status ?? existing.status,
    },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      dentist: { select: { id: true, name: true } },
    },
  });
  if (input.status && input.status !== existing.status) {
    const updPayload = {
      patientName: `${updated.patient.firstName} ${updated.patient.lastName}`,
      dentistName: updated.dentist.name,
      startsAt: updated.startsAt,
      endsAt: updated.endsAt,
      reason: updated.reason,
      status: updated.status,
    };
    sendAppointmentEmail({ patientEmail: updated.patient.email, ...updPayload }).catch(() => {});
    sendAppointmentWhatsapp({ patientPhone: updated.patient.phone, ...updPayload }).catch(() => {});
  }
  return updated;
}

export async function deleteAppointment(id: string) {
  try {
    await prisma.appointment.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Cita no encontrada');
    }
    throw err;
  }
}
