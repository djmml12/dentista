import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clinicConfigApi } from './clinic-config.api';

export const CLINIC_CONFIG_KEY = ['clinic-config'] as const;

export function useClinicConfig() {
  return useQuery({
    queryKey: CLINIC_CONFIG_KEY,
    queryFn: clinicConfigApi.get,
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveClinicConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clinicConfigApi.save,
    onSuccess: () => qc.invalidateQueries({ queryKey: CLINIC_CONFIG_KEY }),
  });
}
