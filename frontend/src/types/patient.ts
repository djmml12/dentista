export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  photoKey: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientListItem {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  createdAt: string;
  photoKey: string | null;
  photoUrl: string | null;
}

export interface PatientWithHistory extends Patient {
  medicalHistory: MedicalHistory | null;
}

export interface PatientListResponse {
  items: PatientListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MedicalHistory {
  id: string;
  patientId: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  isPregnant: boolean;
  isSmoker: boolean;
  isDiabetic: boolean;
  bloodType: string | null;
  freeText: string | null;
  updatedAt: string;
}

export interface PatientSummary extends PatientWithHistory {
  _count: {
    appointments: number;
    clinicalNotes: number;
    mediaFiles: number;
    toothRecords: number;
  };
  appointments: Array<{
    id: string;
    startsAt: string;
    endsAt: string;
    status: string;
    reason: string | null;
  }>;
}

export interface PatientFormInput {
  firstName: string;
  lastName: string;
  documentId?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
}

export interface MedicalHistoryInput {
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  isPregnant: boolean;
  isSmoker: boolean;
  isDiabetic: boolean;
  bloodType?: string | null;
  freeText?: string | null;
}
