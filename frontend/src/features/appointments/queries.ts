import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as apiSvc from './appointments.api';
import type { AppointmentInput, AppointmentStatus } from '@/types/appointment';

export const appointmentsKeys = {
  all: ['appointments'] as const,
  list: (p: Record<string, string | undefined>) => ['appointments', 'list', p] as const,
  byPatient: (id: string) => ['appointments', 'patient', id] as const,
  dentists: ['dentists'] as const,
};

export function useAppointments(params: { from?: string; to?: string; dentistId?: string }) {
  return useQuery({
    queryKey: appointmentsKeys.list(params),
    queryFn: () => apiSvc.listAppointments(params),
  });
}

export function usePatientAppointments(patientId: string | undefined) {
  return useQuery({
    queryKey: patientId ? appointmentsKeys.byPatient(patientId) : ['appointments', 'patient', 'none'],
    queryFn: () => apiSvc.listAppointments({ patientId: patientId! }),
    enabled: !!patientId,
  });
}

export function useDentists() {
  return useQuery({ queryKey: appointmentsKeys.dentists, queryFn: apiSvc.listDentists });
}

export function useCreateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AppointmentInput) => apiSvc.createAppointment(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentsKeys.all }),
  });
}

export function useUpdateAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<AppointmentInput> }) =>
      apiSvc.updateAppointment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentsKeys.all }),
  });
}

export function useDeleteAppointment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiSvc.deleteAppointment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentsKeys.all }),
  });
}

export function useUpdateAppointmentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      apiSvc.updateAppointment(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: appointmentsKeys.all }),
  });
}
