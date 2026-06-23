import { api } from '@/lib/api';

export interface EmailConfig {
  id: string;
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  hasPass: boolean;
  fromName: string;
  fromEmail: string;
  notifyAppointment: boolean;
  notifyPrescription: boolean;
  reminderHoursBefore: number[];
  updatedAt: string;
}

export interface EmailConfigInput {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  fromName: string;
  fromEmail: string;
  notifyAppointment: boolean;
  notifyPrescription: boolean;
  reminderHoursBefore: number[];
}

export const emailApi = {
  getConfig: () => api<EmailConfig | null>('/email-config'),
  saveConfig: (data: EmailConfigInput) =>
    api<EmailConfig>('/email-config', { method: 'PUT', body: (data) }),
  sendTest: (to: string) =>
    api<{ ok: boolean }>('/email-config/test', { method: 'POST', body: ({ to }) }),
};
