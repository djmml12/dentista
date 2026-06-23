import { api } from '@/lib/api';
import type { Appointment, AppointmentInput, Dentist } from '@/types/appointment';

export function listAppointments(params: {
  from?: string;
  to?: string;
  dentistId?: string;
  patientId?: string;
}) {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v) s.set(k, v);
  });
  const qs = s.toString();
  return api<Appointment[]>(`/appointments${qs ? `?${qs}` : ''}`);
}

export const getAppointment = (id: string) => api<Appointment>(`/appointments/${id}`);
export const createAppointment = (body: AppointmentInput) =>
  api<Appointment>('/appointments', { method: 'POST', body });
export const updateAppointment = (id: string, body: Partial<AppointmentInput>) =>
  api<Appointment>(`/appointments/${id}`, { method: 'PATCH', body });
export const deleteAppointment = (id: string) =>
  api<void>(`/appointments/${id}`, { method: 'DELETE' });

export const listDentists = () => api<Dentist[]>('/users/dentists');
