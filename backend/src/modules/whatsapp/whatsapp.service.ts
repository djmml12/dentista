import { prisma } from '../../lib/prisma.js';

const GRAPH_API = 'https://graph.facebook.com/v20.0';

export async function getConfig() {
  return prisma.whatsappConfig.findFirst();
}

export async function upsertConfig(data: {
  enabled: boolean;
  phoneNumberId: string;
  accessToken?: string;
  notifyAppointment: boolean;
  notifyPrescription: boolean;
  appointmentTemplateName: string;
  prescriptionTemplateName: string;
  templateLanguage: string;
}) {
  const existing = await prisma.whatsappConfig.findFirst();
  if (existing) {
    return prisma.whatsappConfig.update({
      where: { id: existing.id },
      data: {
        enabled: data.enabled,
        phoneNumberId: data.phoneNumberId,
        ...(data.accessToken !== undefined && data.accessToken !== ''
          ? { accessToken: data.accessToken }
          : {}),
        notifyAppointment: data.notifyAppointment,
        notifyPrescription: data.notifyPrescription,
        appointmentTemplateName: data.appointmentTemplateName,
        prescriptionTemplateName: data.prescriptionTemplateName,
        templateLanguage: data.templateLanguage,
      },
    });
  }
  return prisma.whatsappConfig.create({
    data: { ...data, accessToken: data.accessToken ?? '' },
  });
}

function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  const digits = phone.replace(/[^\d+]/g, '');
  // If it starts with + assume E.164; otherwise assume Mexico (52)
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('52')) return digits;
  return `52${digits}`;
}

async function sendTemplateMessage(params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: object[];
}) {
  const response = await fetch(`${GRAPH_API}/${params.phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        components: params.components ?? [],
      },
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    const msg =
      (body as { error?: { message?: string } }).error?.message ??
      `WhatsApp API error ${response.status}`;
    throw new Error(msg);
  }
  return response.json();
}

export async function sendTestWhatsapp(to: string) {
  const cfg = await prisma.whatsappConfig.findFirst();
  if (!cfg || !cfg.phoneNumberId || !cfg.accessToken) {
    throw new Error('Configuración de WhatsApp incompleta');
  }
  const normalized = normalizePhone(to);
  // Uses the hello_world template which is pre-approved in all Meta accounts
  await sendTemplateMessage({
    phoneNumberId: cfg.phoneNumberId,
    accessToken: cfg.accessToken,
    to: normalized,
    templateName: 'hello_world',
    languageCode: 'en_US',
  });
}

export async function sendAppointmentWhatsapp(appointment: {
  patientPhone: string | null | undefined;
  patientName: string;
  dentistName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
}) {
  if (!appointment.patientPhone) return;
  const cfg = await prisma.whatsappConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.notifyAppointment || !cfg.phoneNumberId || !cfg.accessToken) return;

  const fecha = appointment.startsAt.toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const hora = appointment.startsAt.toLocaleTimeString('es-GT', {
    hour: '2-digit', minute: '2-digit',
  });

  const statusLabel: Record<string, string> = {
    SCHEDULED: 'Agendada',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No se presentó',
  };

  const normalized = normalizePhone(appointment.patientPhone);

  // Template body parameters: {{1}} name, {{2}} date, {{3}} time, {{4}} dentist, {{5}} status
  await sendTemplateMessage({
    phoneNumberId: cfg.phoneNumberId,
    accessToken: cfg.accessToken,
    to: normalized,
    templateName: cfg.appointmentTemplateName,
    languageCode: cfg.templateLanguage,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: appointment.patientName },
          { type: 'text', text: fecha },
          { type: 'text', text: hora },
          { type: 'text', text: appointment.dentistName },
          { type: 'text', text: statusLabel[appointment.status] ?? appointment.status },
        ],
      },
    ],
  });
}

export async function sendPrescriptionWhatsapp(prescription: {
  patientPhone: string | null | undefined;
  patientName: string;
  prescriberName: string;
  issuedAt: Date;
}) {
  if (!prescription.patientPhone) return;
  const cfg = await prisma.whatsappConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.notifyPrescription || !cfg.phoneNumberId || !cfg.accessToken) return;

  const fecha = prescription.issuedAt.toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const normalized = normalizePhone(prescription.patientPhone);

  // Template body parameters: {{1}} patient name, {{2}} date, {{3}} doctor name
  await sendTemplateMessage({
    phoneNumberId: cfg.phoneNumberId,
    accessToken: cfg.accessToken,
    to: normalized,
    templateName: cfg.prescriptionTemplateName,
    languageCode: cfg.templateLanguage,
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: prescription.patientName },
          { type: 'text', text: fecha },
          { type: 'text', text: prescription.prescriberName },
        ],
      },
    ],
  });
}
