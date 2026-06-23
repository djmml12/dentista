export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface Appointment {
  id: string;
  patientId: string;
  dentistId: string;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  patient: { id: string; firstName: string; lastName: string };
  dentist: { id: string; name: string };
}

export interface Dentist {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'DENTIST';
}

export interface AppointmentInput {
  patientId: string;
  dentistId: string;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  notes?: string | null;
  status?: AppointmentStatus;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
  SCHEDULED: '#0ea5b7',
  CONFIRMED: '#16a34a',
  IN_PROGRESS: '#f59e0b',
  COMPLETED: '#64748b',
  CANCELLED: '#ef4444',
  NO_SHOW: '#94a3b8',
};
