import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './prescriptions.api';
import type { PrescriptionInput } from '@/types/prescription';

export const prescriptionsKeys = {
  byPatient: (id: string) => ['prescriptions', 'patient', id] as const,
  detail: (id: string) => ['prescriptions', 'detail', id] as const,
};

export function usePrescriptions(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? prescriptionsKeys.byPatient(patientId) : ['prescriptions', 'none'],
    queryFn: () => svc.listPrescriptions(patientId!),
    enabled: !!patientId,
  });
}

export function usePrescription(id: string | undefined) {
  return useQuery({
    queryKey: id ? prescriptionsKeys.detail(id) : ['prescriptions', 'detail', 'none'],
    queryFn: () => svc.getPrescription(id!),
    enabled: !!id,
  });
}

export function useCreatePrescription(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PrescriptionInput) => svc.createPrescription(patientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: prescriptionsKeys.byPatient(patientId) }),
  });
}

export function useUpdatePrescription(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: PrescriptionInput }) => svc.updatePrescription(id, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: prescriptionsKeys.byPatient(patientId) });
      qc.invalidateQueries({ queryKey: prescriptionsKeys.detail(v.id) });
    },
  });
}

export function useDeletePrescription(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deletePrescription(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: prescriptionsKeys.byPatient(patientId) }),
  });
}
