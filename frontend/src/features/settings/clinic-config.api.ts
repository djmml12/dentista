import { api } from '@/lib/api';

export interface ClinicConfig {
  id: string;
  workStart: number;
  workEnd: number;
  updatedAt: string;
}

export const clinicConfigApi = {
  get: () => api<ClinicConfig>('/clinic-config'),
  save: (data: { workStart: number; workEnd: number }) =>
    api<ClinicConfig>('/clinic-config', { method: 'PUT', body: data }),
};
