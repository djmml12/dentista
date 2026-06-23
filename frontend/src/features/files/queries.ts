import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './files.api';
import type { MediaFile, MediaType } from '@/types/file';

export const filesKeys = {
  byPatient: (id: string, type?: MediaType) => ['files', id, type ?? 'all'] as const,
};

export function usePatientFiles(patientId: string | undefined, type?: MediaType) {
  return useQuery({
    queryKey: patientId ? filesKeys.byPatient(patientId, type) : ['files', 'none'],
    queryFn: () => svc.listPatientFiles(patientId!, type),
    enabled: !!patientId,
  });
}

export function useDeleteFile(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteFile(id),
    onSuccess: (_data, id) => {
      qc.setQueriesData<MediaFile[]>(
        { queryKey: ['files', patientId], exact: false },
        (old) => (old ? old.filter((f) => f.id !== id) : old),
      );
      void qc.invalidateQueries({ queryKey: ['files', patientId], exact: false });
    },
  });
}

export function useDownloadUrl() {
  return useMutation({ mutationFn: (id: string) => svc.getDownloadUrl(id) });
}
