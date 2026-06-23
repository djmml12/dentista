import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { deleteObject, presignDownload, presignUpload } from '../../lib/storage.js';
import { HttpError } from '../../middleware/error.js';
import type { CreatePatientInput, UpdatePatientInput, MedicalHistoryInput } from './patients.schema.js';

function normalize<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      out[k] = t.length === 0 ? null : t;
    } else {
      out[k] = v;
    }
  }
  if ('birthDate' in out && typeof out.birthDate === 'string') {
    out.birthDate = new Date(out.birthDate as string);
  }
  return out as T;
}

/** Neutraliza los comodines de LIKE (`%`, `_`, `\`) en texto de búsqueda del usuario. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => '\\' + c);
}

interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  birthDate: Date | null;
  createdAt: Date;
  photoKey: string | null;
}

export async function listPatients(params: { q?: string; page: number; pageSize: number }) {
  const { q, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  let items: PatientListItem[];
  let total: number;

  if (!q) {
    [items, total] = await Promise.all([
      prisma.patient.findMany({
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          documentId: true,
          phone: true,
          email: true,
          birthDate: true,
          createdAt: true,
          photoKey: true,
        },
      }),
      prisma.patient.count(),
    ]);
  } else {
    const pattern = `%${escapeLike(q)}%`;
    const condition = Prisma.sql`
      unaccent(lower(
        "firstName" || ' ' || "lastName" || ' ' ||
        coalesce("documentId", '') || ' ' || coalesce("phone", '')
      )) LIKE unaccent(lower(${pattern}))
    `;

    [items, [{ count: total } = { count: 0 }]] = await Promise.all([
      prisma.$queryRaw<PatientListItem[]>(Prisma.sql`
        SELECT id, "firstName", "lastName", "documentId", "phone", email, "birthDate", "createdAt", "photoKey"
        FROM "Patient"
        WHERE ${condition}
        ORDER BY "lastName" ASC, "firstName" ASC
        LIMIT ${pageSize} OFFSET ${skip}
      `),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT count(*)::int AS count FROM "Patient" WHERE ${condition}
      `),
    ]);
  }

  // Generar URLs pre-firmadas para fotos en paralelo
  const itemsWithPhoto = await Promise.all(
    items.map(async (p) => {
      if (!p.photoKey) return { ...p, photoUrl: null };
      const photoUrl = await presignDownload(p.photoKey, 3600).catch(() => null);
      return { ...p, photoUrl };
    }),
  );

  return { items: itemsWithPhoto, total, page, pageSize };
}

export async function createPatient(input: CreatePatientInput) {
  const data = normalize(input) as Prisma.PatientCreateInput;
  try {
    return await prisma.patient.create({ data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new HttpError(409, 'Ya existe un paciente con esa identificación');
    }
    throw err;
  }
}

export async function getPatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { medicalHistory: true },
  });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  const photoUrl = patient.photoKey ? await presignDownload(patient.photoKey, 3600).catch(() => null) : null;
  return { ...patient, photoUrl };
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  const data = normalize(input) as Prisma.PatientUpdateInput;
  try {
    return await prisma.patient.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') throw new HttpError(404, 'Paciente no encontrado');
      if (err.code === 'P2002') throw new HttpError(409, 'Ya existe un paciente con esa identificación');
    }
    throw err;
  }
}

export async function deletePatient(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { photoKey: true },
  });
  const files = await prisma.mediaFile.findMany({
    where: { patientId: id },
    select: { storageKey: true },
  });
  try {
    await prisma.patient.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new HttpError(404, 'Paciente no encontrado');
    }
    throw err;
  }
  const keysToDelete = [
    ...files.map((f) => f.storageKey),
    ...(patient?.photoKey ? [patient.photoKey] : []),
  ];
  await Promise.allSettled(keysToDelete.map((k) => deleteObject(k)));
}

export async function getSummary(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      medicalHistory: true,
      _count: {
        select: { appointments: true, clinicalNotes: true, mediaFiles: true, toothRecords: true },
      },
      appointments: {
        orderBy: { startsAt: 'desc' },
        take: 5,
        select: { id: true, startsAt: true, endsAt: true, status: true, reason: true },
      },
    },
  });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  const photoUrl = patient.photoKey ? await presignDownload(patient.photoKey, 3600).catch(() => null) : null;
  return { ...patient, photoUrl };
}

export async function getMedicalHistory(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  const history = await prisma.medicalHistory.findUnique({ where: { patientId } });
  return history;
}

export async function upsertMedicalHistory(patientId: string, input: MedicalHistoryInput) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  const data = {
    allergies: input.allergies,
    chronicConditions: input.chronicConditions,
    currentMedications: input.currentMedications,
    isPregnant: input.isPregnant,
    isSmoker: input.isSmoker,
    isDiabetic: input.isDiabetic,
    bloodType: input.bloodType ?? null,
    freeText: input.freeText ?? null,
  };
  return prisma.medicalHistory.upsert({
    where: { patientId },
    create: { patientId, ...data },
    update: data,
  });
}

export async function requestPhotoUpload(id: string, contentType: string) {
  const patient = await prisma.patient.findUnique({ where: { id }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const key = `patients/${id}/photo.${ext}`;
  const uploadUrl = await presignUpload(key, contentType, 300);
  return { uploadUrl, key };
}

export async function confirmPhoto(id: string, key: string) {
  const patient = await prisma.patient.findUnique({ where: { id }, select: { photoKey: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  // Si había foto anterior con key diferente, borrarla del storage
  if (patient.photoKey && patient.photoKey !== key) {
    await deleteObject(patient.photoKey).catch(() => {});
  }
  const updated = await prisma.patient.update({ where: { id }, data: { photoKey: key } });
  const photoUrl = await presignDownload(key, 3600).catch(() => null);
  return { ...updated, photoUrl };
}

export async function deletePhoto(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id }, select: { photoKey: true } });
  if (!patient) throw new HttpError(404, 'Paciente no encontrado');
  if (!patient.photoKey) throw new HttpError(404, 'El paciente no tiene foto');
  await deleteObject(patient.photoKey).catch(() => {});
  return prisma.patient.update({ where: { id }, data: { photoKey: null } });
}
