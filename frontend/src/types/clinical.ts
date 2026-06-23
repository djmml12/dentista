export interface ClinicalNote {
  id: string;
  patientId: string;
  appointmentId: string | null;
  authorId: string;
  visitDate: string | null;
  procedure: string | null;
  diagnosis: string | null;
  treatment: string | null;
  observations: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  appointment: { id: string; startsAt: string; reason: string | null } | null;
}

export interface ClinicalNoteInput {
  appointmentId?: string | null;
  visitDate?: string | null;
  procedure?: string | null;
  diagnosis?: string | null;
  treatment?: string | null;
  observations?: string | null;
}

export type ToothCondition =
  | 'HEALTHY'
  | 'CARIES'
  | 'FILLED'
  | 'CROWN'
  | 'EXTRACTED'
  | 'IMPLANT'
  | 'ROOT_CANAL'
  | 'MISSING'
  | 'SEALANT'
  | 'FRACTURE';

export interface ToothRecord {
  id: string;
  patientId: string;
  toothNumber: number;
  condition: ToothCondition;
  surface: string | null;
  notes: string | null;
  updatedAt: string;
  updatedById: string;
}

export interface ToothRecordInput {
  condition: ToothCondition;
  surface?: string | null;
  notes?: string | null;
}

export const TOOTH_CONDITION_LABELS: Record<ToothCondition, string> = {
  HEALTHY: 'Sano',
  CARIES: 'Caries',
  FILLED: 'Obturación',
  CROWN: 'Corona',
  EXTRACTED: 'Extraído',
  IMPLANT: 'Implante',
  ROOT_CANAL: 'Endodoncia',
  MISSING: 'Ausente',
  SEALANT: 'Sellante',
  FRACTURE: 'Fractura',
};

export const TOOTH_CONDITION_COLORS: Record<ToothCondition, string> = {
  HEALTHY: '#e5e7eb',
  CARIES: '#ef4444',
  FILLED: '#3b82f6',
  CROWN: '#f59e0b',
  EXTRACTED: '#94a3b8',
  IMPLANT: '#8b5cf6',
  ROOT_CANAL: '#ec4899',
  MISSING: '#cbd5e1',
  SEALANT: '#22c55e',
  FRACTURE: '#f97316',
};
