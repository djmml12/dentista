import { api } from '@/lib/api';
import type { QuickNote } from '@/types/quicknote';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const listQuickNotes = (patientId: string) => api<QuickNote[]>(`/patients/${patientId}/quick-notes`);
const createQuickNote = (patientId: string, body: string) =>
  api<QuickNote>(`/patients/${patientId}/quick-notes`, { method: 'POST', body: { body } });
const updateQuickNote = (id: string, body: string) =>
  api<QuickNote>(`/quick-notes/${id}`, { method: 'PATCH', body: { body } });
const deleteQuickNote = (id: string) => api<void>(`/quick-notes/${id}`, { method: 'DELETE' });

const keys = { byPatient: (id: string) => ['quick-notes', 'patient', id] as const };

export function useQuickNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? keys.byPatient(patientId) : ['quick-notes', 'none'],
    queryFn: () => listQuickNotes(patientId!),
    enabled: !!patientId,
  });
}

export function useCreateQuickNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => createQuickNote(patientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.byPatient(patientId) }),
  });
}

export function useUpdateQuickNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateQuickNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.byPatient(patientId) }),
  });
}

export function useDeleteQuickNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteQuickNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.byPatient(patientId) }),
  });
}
