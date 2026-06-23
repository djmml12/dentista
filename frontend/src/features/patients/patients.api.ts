import { api } from '@/lib/api';
import type {
  MedicalHistory,
  MedicalHistoryInput,
  Patient,
  PatientFormInput,
  PatientListResponse,
  PatientSummary,
  PatientWithHistory,
} from '@/types/patient';

export function listPatients(params: { q?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.pageSize) search.set('pageSize', String(params.pageSize));
  const qs = search.toString();
  return api<PatientListResponse>(`/patients${qs ? `?${qs}` : ''}`);
}

export function getPatient(id: string) {
  return api<PatientWithHistory>(`/patients/${id}`);
}

export function getPatientSummary(id: string) {
  return api<PatientSummary>(`/patients/${id}/summary`);
}

export function createPatient(body: PatientFormInput) {
  return api<Patient>('/patients', { method: 'POST', body });
}

export function updatePatient(id: string, body: Partial<PatientFormInput>) {
  return api<Patient>(`/patients/${id}`, { method: 'PATCH', body });
}

export function deletePatient(id: string) {
  return api<void>(`/patients/${id}`, { method: 'DELETE' });
}

export function getMedicalHistory(patientId: string) {
  return api<MedicalHistory | null>(`/patients/${patientId}/medical-history`);
}

export function putMedicalHistory(patientId: string, body: MedicalHistoryInput) {
  return api<MedicalHistory>(`/patients/${patientId}/medical-history`, { method: 'PUT', body });
}

export function requestPhotoUpload(patientId: string, contentType: string) {
  return api<{ uploadUrl: string; key: string }>(`/patients/${patientId}/photo`, {
    method: 'POST',
    body: { contentType },
  });
}

export function confirmPhoto(patientId: string, key: string) {
  return api<Patient>(`/patients/${patientId}/photo`, { method: 'PATCH', body: { key } });
}

export function deletePhoto(patientId: string) {
  return api<void>(`/patients/${patientId}/photo`, { method: 'DELETE' });
}
