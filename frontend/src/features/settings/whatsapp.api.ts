import { api } from '@/lib/api';

export interface WhatsappConfig {
  id: string;
  enabled: boolean;
  phoneNumberId: string;
  hasToken: boolean;
  notifyAppointment: boolean;
  notifyPrescription: boolean;
  appointmentTemplateName: string;
  prescriptionTemplateName: string;
  templateLanguage: string;
  updatedAt: string;
}

export interface WhatsappConfigInput {
  enabled: boolean;
  phoneNumberId: string;
  accessToken?: string;
  notifyAppointment: boolean;
  notifyPrescription: boolean;
  appointmentTemplateName: string;
  prescriptionTemplateName: string;
  templateLanguage: string;
}

export const whatsappApi = {
  getConfig: () => api<WhatsappConfig | null>('/whatsapp-config'),
  saveConfig: (data: WhatsappConfigInput) =>
    api<WhatsappConfig>('/whatsapp-config', { method: 'PUT', body: (data) }),
  sendTest: (to: string) =>
    api<{ ok: boolean }>('/whatsapp-config/test', { method: 'POST', body: ({ to }) }),
};
