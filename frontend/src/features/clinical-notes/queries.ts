import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as svc from './notes.api';
import type { ClinicalNoteInput } from '@/types/clinical';

export const notesKeys = {
  byPatient: (id: string) => ['notes', 'patient', id] as const,
};

export function usePatientNotes(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? notesKeys.byPatient(patientId) : ['notes', 'none'],
    queryFn: () => svc.listNotes(patientId!),
    enabled: !!patientId,
  });
}

export function useCreateNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClinicalNoteInput) => svc.createNote(patientId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.byPatient(patientId) }),
  });
}

export function useUpdateNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ClinicalNoteInput }) => svc.updateNote(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.byPatient(patientId) }),
  });
}

export function useDeleteNote(patientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => svc.deleteNote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notesKeys.byPatient(patientId) }),
  });
}
