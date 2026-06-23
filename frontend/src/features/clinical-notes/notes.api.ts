import { api } from '@/lib/api';
import type { ClinicalNote, ClinicalNoteInput } from '@/types/clinical';

export const listNotes = (patientId: string) =>
  api<ClinicalNote[]>(`/patients/${patientId}/clinical-notes`);

export const createNote = (patientId: string, body: ClinicalNoteInput) =>
  api<ClinicalNote>(`/patients/${patientId}/clinical-notes`, { method: 'POST', body });

export const updateNote = (id: string, body: ClinicalNoteInput) =>
  api<ClinicalNote>(`/clinical-notes/${id}`, { method: 'PATCH', body });

export const deleteNote = (id: string) =>
  api<void>(`/clinical-notes/${id}`, { method: 'DELETE' });
