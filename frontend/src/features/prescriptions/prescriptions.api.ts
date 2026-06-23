import { api } from '@/lib/api';
import type { Medication, Prescription, PrescriptionInput } from '@/types/prescription';

export const listPrescriptions = (patientId: string) =>
  api<Prescription[]>(`/patients/${patientId}/prescriptions`);

export const getPrescription = (id: string) => api<Prescription>(`/prescriptions/${id}`);

export const createPrescription = (patientId: string, body: PrescriptionInput) =>
  api<Prescription>(`/patients/${patientId}/prescriptions`, { method: 'POST', body });

export const updatePrescription = (id: string, body: PrescriptionInput) =>
  api<Prescription>(`/prescriptions/${id}`, { method: 'PATCH', body });

export const deletePrescription = (id: string) =>
  api<void>(`/prescriptions/${id}`, { method: 'DELETE' });

export const searchMedications = (q: string) =>
  api<Medication[]>(`/medications?q=${encodeURIComponent(q)}&limit=8`);

export const emailPrescription = (id: string) =>
  api<{ ok: boolean }>(`/prescriptions/${id}/email`, { method: 'POST' });
