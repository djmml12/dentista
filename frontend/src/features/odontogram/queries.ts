import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './odontogram.api';
import type { ToothRecordInput } from '@/types/clinical';

export const odontogramKeys = {
  byPatient: (id: string) => ['odontogram', id] as const,
};

export function useOdontogram(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? odontogramKeys.byPatient(patientId) : ['odontogram', 'none'],
    queryFn: () => svc.listTeeth(patientId!),
    enabled: !!patientId,
  });
}

export function useUpsertTooth(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tooth, body }: { tooth: number; body: ToothRecordInput }) =>
      svc.upsertTooth(patientId, tooth, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: odontogramKeys.byPatient(patientId) }),
  });
}

export function useClearTooth(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tooth: number) => svc.clearTooth(patientId, tooth),
    onSuccess: () => qc.invalidateQueries({ queryKey: odontogramKeys.byPatient(patientId) }),
  });
}
