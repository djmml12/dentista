import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as apiSvc from './patients.api';
import type { MedicalHistoryInput, PatientFormInput } from '@/types/patient';

export const patientsKeys = {
  all: ['patients'] as const,
  list: (q: string, page: number) => ['patients', 'list', { q, page }] as const,
  detail: (id: string) => ['patients', 'detail', id] as const,
  summary: (id: string) => ['patients', 'summary', id] as const,
  history: (id: string) => ['patients', 'history', id] as const,
};

export function usePatientsList(q: string, page: number, pageSize = 20) {
  return useQuery({
    queryKey: patientsKeys.list(q, page),
    queryFn: () => apiSvc.listPatients({ q: q || undefined, page, pageSize }),
    placeholderData: keepPreviousData,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: id ? patientsKeys.detail(id) : ['patients', 'detail', 'none'],
    queryFn: () => apiSvc.getPatient(id!),
    enabled: !!id,
  });
}

export function usePatientSummary(id: string | undefined) {
  return useQuery({
    queryKey: id ? patientsKeys.summary(id) : ['patients', 'summary', 'none'],
    queryFn: () => apiSvc.getPatientSummary(id!),
    enabled: !!id,
  });
}

export function useMedicalHistory(id: string | undefined) {
  return useQuery({
    queryKey: id ? patientsKeys.history(id) : ['patients', 'history', 'none'],
    queryFn: () => apiSvc.getMedicalHistory(id!),
    enabled: !!id,
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PatientFormInput) => apiSvc.createPatient(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientsKeys.all }),
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<PatientFormInput>) => apiSvc.updatePatient(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientsKeys.all });
      qc.invalidateQueries({ queryKey: patientsKeys.detail(id) });
      qc.invalidateQueries({ queryKey: patientsKeys.summary(id) });
    },
  });
}

export function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSvc.deletePatient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: patientsKeys.all }),
  });
}

export function useSaveMedicalHistory(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MedicalHistoryInput) => apiSvc.putMedicalHistory(patientId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientsKeys.history(patientId) });
      qc.invalidateQueries({ queryKey: patientsKeys.summary(patientId) });
      qc.invalidateQueries({ queryKey: patientsKeys.detail(patientId) });
    },
  });
}

export function useUploadPatientPhoto(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { uploadUrl, key } = await apiSvc.requestPhotoUpload(patientId, file.type);
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      return apiSvc.confirmPhoto(patientId, key);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientsKeys.detail(patientId) });
      qc.invalidateQueries({ queryKey: patientsKeys.list('', 1) });
      qc.invalidateQueries({ queryKey: patientsKeys.all });
    },
  });
}

export function useDeletePatientPhoto(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSvc.deletePhoto(patientId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientsKeys.detail(patientId) });
      qc.invalidateQueries({ queryKey: patientsKeys.all });
    },
  });
}
