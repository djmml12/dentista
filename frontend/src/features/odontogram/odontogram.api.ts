import { api } from '@/lib/api';
import type { ToothRecord, ToothRecordInput } from '@/types/clinical';

export const listTeeth = (patientId: string) =>
  api<ToothRecord[]>(`/patients/${patientId}/odontogram`);

export const upsertTooth = (patientId: string, toothNumber: number, body: ToothRecordInput) =>
  api<ToothRecord>(`/patients/${patientId}/odontogram/${toothNumber}`, { method: 'PUT', body });

export const clearTooth = (patientId: string, toothNumber: number) =>
  api<void>(`/patients/${patientId}/odontogram/${toothNumber}`, { method: 'DELETE' });
