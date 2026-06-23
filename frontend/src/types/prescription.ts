export interface Medication {
  id: string;
  name: string;
  form: string | null;
  strength: string | null;
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  presentation: string | null;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: string | null;
  instructions: string | null;
  order: number;
}

export interface Prescription {
  id: string;
  patientId: string;
  prescriberId: string;
  issuedAt: string;
  diagnosis: string | null;
  notes: string | null;
  createdAt: string;
  items: PrescriptionItem[];
  prescriber: { id: string; name: string; licenseNumber: string | null; specialty: string | null };
  patient: { id: string; firstName: string; lastName: string; documentId: string | null; birthDate: string | null; email: string | null; phone: string | null };
}

export interface PrescriptionItemInput {
  drugName: string;
  presentation?: string | null;
  dose?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: string | null;
  instructions?: string | null;
}

export interface PrescriptionInput {
  prescriberId?: string;
  issuedAt?: string;
  diagnosis?: string | null;
  notes?: string | null;
  items: PrescriptionItemInput[];
}
