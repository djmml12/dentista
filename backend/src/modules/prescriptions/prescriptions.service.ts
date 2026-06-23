import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import type { CreatePrescriptionInput, PrescriptionItemInput, UpdatePrescriptionInput } from './prescriptions.schema.js';
import { sendPrescriptionEmail } from '../email/email.service.js';
import { sendPrescriptionWhatsapp } from '../whatsapp/whatsapp.service.js';

const include = {
  items: { orderBy: { order: 'asc' } },
  prescriber: { select: { id: true, name: true, licenseNumber: true, specialty: true } },
  patient: {
    select: { id: true, firstName: true, lastName: true, documentId: true, birthDate: true, email: true, phone: true },
  },
} satisfies Prisma.PrescriptionInclude;

function itemData(items: PrescriptionItemInput[]) {
  return items.map((it, order) => ({
    drugName: it.drugName,
    presentation: it.presentation ?? null,
    dose: it.dose ?? null,
    frequency: it.frequency ?? null,
    duration: it.duration ?? null,
    quantity: it.quantity ?? null,
    instructions: it.instructions ?? null,
    order,
  }));
}

export async function listPrescriptions(patientId: string) {
  return prisma.prescription.findMany({
    where: { patientId },
    orderBy: { issuedAt: 'desc' },
    include,
  });
}

export async function getPrescription(id: string) {
  const p = await prisma.prescription.findUnique({ where: { id }, include });
  if (!p) throw new HttpError(404, 'Receta no encontrada');
  return p;
}

export async function createPrescription(
  patientId: string,
  fallbackPrescriberId: string,
  input: CreatePrescriptionInput,
) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');

  const rx = await prisma.prescription.create({
    data: {
      patientId,
      prescriberId: input.prescriberId ?? fallbackPrescriberId,
      issuedAt: input.issuedAt ? new Date(input.issuedAt) : undefined,
      diagnosis: input.diagnosis ?? null,
      notes: input.notes ?? null,
      items: { create: itemData(input.items) },
    },
    include,
  });
  const rxPayload = {
    patientName: `${rx.patient.firstName} ${rx.patient.lastName}`,
    prescriberName: rx.prescriber.name,
    issuedAt: rx.issuedAt,
  };
  sendPrescriptionEmail({
    patientEmail: rx.patient.email,
    prescriberLicense: rx.prescriber.licenseNumber,
    prescriberSpecialty: rx.prescriber.specialty,
    diagnosis: rx.diagnosis,
    items: rx.items,
    ...rxPayload,
  }).catch(() => {});
  sendPrescriptionWhatsapp({ patientPhone: rx.patient.phone, ...rxPayload }).catch(() => {});
  return rx;
}

export async function updatePrescription(id: string, input: UpdatePrescriptionInput) {
  const existing = await prisma.prescription.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, 'Receta no encontrada');

  return prisma.prescription.update({
    where: { id },
    data: {
      ...(input.prescriberId ? { prescriberId: input.prescriberId } : {}),
      ...(input.issuedAt ? { issuedAt: new Date(input.issuedAt) } : {}),
      ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis ?? null } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      // Si llegan items, reemplazamos el set completo.
      ...(input.items ? { items: { deleteMany: {}, create: itemData(input.items) } } : {}),
    },
    include,
  });
}

export async function deletePrescription(id: string) {
  try {
    await prisma.prescription.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Receta no encontrada');
    }
    throw err;
  }
}
