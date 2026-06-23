import nodemailer from 'nodemailer';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';

export async function getConfig() {
  return prisma.emailConfig.findFirst();
}

export async function upsertConfig(data: {
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
}) {
  const existing = await prisma.emailConfig.findFirst();
  if (existing) {
    return prisma.emailConfig.update({
      where: { id: existing.id },
      data: {
        enabled: data.enabled,
        host: data.host,
        port: data.port,
        secure: data.secure,
        user: data.user,
        ...(data.pass !== undefined && data.pass !== '' ? { pass: data.pass } : {}),
        fromName: data.fromName,
        fromEmail: data.fromEmail,
        notifyAppointment: data.notifyAppointment,
        notifyPrescription: data.notifyPrescription,
        reminderHoursBefore: data.reminderHoursBefore,
      },
    });
  }
  return prisma.emailConfig.create({ data: { ...data, pass: data.pass ?? '' } });
}

function buildTransporter(cfg: { host: string; port: number; secure: boolean; user: string; pass: string }) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendTestEmail(to: string) {
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.user || !cfg.pass) throw new HttpError(422, 'Configuración SMTP incompleta');
  const transport = buildTransporter(cfg);
  await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
    to,
    subject: 'Correo de prueba – Consultorio Dental',
    html: `<p>Este es un correo de prueba enviado desde el sistema de gestión del consultorio dental.</p>
           <p>Si recibes este mensaje, la configuración SMTP es correcta.</p>`,
  });
}

export async function sendAppointmentEmail(appointment: {
  patientEmail: string | null | undefined;
  patientName: string;
  dentistName: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string | null;
  status: string;
  isReminder?: boolean;
  reminderHours?: number;
}) {
  if (!appointment.patientEmail) return;
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.notifyAppointment || !cfg.user || !cfg.pass) return;

  const transport = buildTransporter(cfg);
  const fecha = appointment.startsAt.toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const horaInicio = appointment.startsAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  const horaFin = appointment.endsAt.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });

  const statusLabel: Record<string, string> = {
    SCHEDULED: 'Agendada',
    CONFIRMED: 'Confirmada',
    IN_PROGRESS: 'En curso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No se presentó',
  };

  const isReminder = appointment.isReminder ?? false;
  const heading = isReminder ? 'Recordatorio de cita' : 'Confirmación de cita';
  const intro = isReminder
    ? `Le recordamos que tiene una cita programada${appointment.reminderHours ? ` en ${appointment.reminderHours === 1 ? '1 hora' : `${appointment.reminderHours} horas`}` : ''} con los siguientes detalles:`
    : 'Le informamos que tiene una cita programada con los siguientes detalles:';
  const subject = isReminder ? `Recordatorio de cita dental – ${fecha}` : `Cita dental – ${fecha}`;

  await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
    to: appointment.patientEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#333">
        <h2 style="color:#0d9488">${heading}</h2>
        <p>Estimado/a <strong>${appointment.patientName}</strong>,</p>
        <p>${intro}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#666;width:140px">Fecha</td><td><strong>${fecha}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#666">Horario</td><td><strong>${horaInicio} – ${horaFin}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#666">Dentista</td><td><strong>${appointment.dentistName}</strong></td></tr>
          ${appointment.reason ? `<tr><td style="padding:8px 0;color:#666">Motivo</td><td>${appointment.reason}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#666">Estado</td><td>${statusLabel[appointment.status] ?? appointment.status}</td></tr>
        </table>
        <p style="color:#888;font-size:13px">Si necesita cancelar o reprogramar su cita, por favor comuníquese con nosotros con anticipación.</p>
        <p style="color:#888;font-size:13px">${cfg.fromName}</p>
      </div>`,
  });
}

async function doSendPrescriptionEmail(
  cfg: { host: string; port: number; secure: boolean; user: string; pass: string; fromName: string; fromEmail: string },
  prescription: {
    patientEmail: string;
    patientName: string;
    prescriberName: string;
    prescriberLicense?: string | null;
    prescriberSpecialty?: string | null;
    issuedAt: Date;
    diagnosis?: string | null;
    items: Array<{
      drugName: string;
      presentation?: string | null;
      dose?: string | null;
      frequency?: string | null;
      duration?: string | null;
      instructions?: string | null;
    }>;
  },
) {
  const transport = buildTransporter(cfg);
  const fecha = prescription.issuedAt.toLocaleDateString('es-GT', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const itemsHtml = prescription.items
    .map(
      (it, i) => `
      <tr style="border-top:1px solid #eee">
        <td style="padding:10px 0;vertical-align:top;font-weight:bold;color:#333">${i + 1}. ${it.drugName}${it.presentation ? ` <span style="font-weight:normal;color:#666">(${it.presentation})</span>` : ''}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px 16px;color:#555;font-size:14px">
          ${[it.dose, it.frequency, it.duration].filter(Boolean).join(' · ')}
          ${it.instructions ? `<br><em>${it.instructions}</em>` : ''}
        </td>
      </tr>`,
    )
    .join('');

  await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.user}>`,
    to: prescription.patientEmail,
    subject: `Receta médica – ${fecha}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
        <h2 style="color:#0d9488">Receta médica</h2>
        <p>Estimado/a <strong>${prescription.patientName}</strong>,</p>
        <p>A continuación encontrará el detalle de su receta emitida el <strong>${fecha}</strong>:</p>
        ${prescription.diagnosis ? `<p><strong>Diagnóstico:</strong> ${prescription.diagnosis}</p>` : ''}
        <h3 style="margin-bottom:4px">Medicamentos prescritos</h3>
        <table style="width:100%;border-collapse:collapse">${itemsHtml}</table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
        <p style="color:#555;font-size:13px">
          <strong>${prescription.prescriberName}</strong><br>
          ${prescription.prescriberSpecialty ? `${prescription.prescriberSpecialty}<br>` : ''}
          ${prescription.prescriberLicense ? `Cédula: ${prescription.prescriberLicense}` : ''}
        </p>
        <p style="color:#888;font-size:12px">Este correo es informativo. Consulte siempre a su médico ante cualquier duda.</p>
      </div>`,
  });
}

export async function sendPrescriptionEmail(prescription: {
  patientEmail: string | null | undefined;
  patientName: string;
  prescriberName: string;
  prescriberLicense?: string | null;
  prescriberSpecialty?: string | null;
  issuedAt: Date;
  diagnosis?: string | null;
  items: Array<{
    drugName: string;
    presentation?: string | null;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
}) {
  if (!prescription.patientEmail) return;
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.notifyPrescription || !cfg.user || !cfg.pass) return;
  await doSendPrescriptionEmail(cfg, { ...prescription, patientEmail: prescription.patientEmail });
}

export async function checkAndSendReminders() {
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.enabled || !cfg.notifyAppointment || cfg.reminderHoursBefore.length === 0 || !cfg.user || !cfg.pass) return;

  const now = new Date();
  const windowMs = 30 * 60 * 1000; // ventana de ±30 min alrededor de cada momento objetivo

  for (const hours of cfg.reminderHoursBefore) {
    const targetMs = hours * 60 * 60 * 1000;
    const windowStart = new Date(now.getTime() + targetMs - windowMs);
    const windowEnd = new Date(now.getTime() + targetMs + windowMs);

    const appointments = await prisma.appointment.findMany({
      where: {
        startsAt: { gte: windowStart, lte: windowEnd },
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      include: {
        patient: { select: { email: true, firstName: true, lastName: true } },
        dentist: { select: { name: true } },
      },
    });

    for (const appt of appointments) {
      if (!appt.patient.email) continue;
      if (appt.remindersSentHours.includes(hours)) continue;
      try {
        await sendAppointmentEmail({
          patientEmail: appt.patient.email,
          patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
          dentistName: appt.dentist.name,
          startsAt: appt.startsAt,
          endsAt: appt.endsAt,
          reason: appt.reason,
          status: appt.status,
          isReminder: true,
          reminderHours: hours,
        });
        await prisma.appointment.update({
          where: { id: appt.id },
          data: { remindersSentHours: { push: hours } },
        });
      } catch (err) {
        console.error(`Error enviando recordatorio (${hours}h) para cita ${appt.id}:`, err);
      }
    }
  }
}

export async function sendPrescriptionEmailDirect(prescription: {
  patientEmail: string | null | undefined;
  patientName: string;
  prescriberName: string;
  prescriberLicense?: string | null;
  prescriberSpecialty?: string | null;
  issuedAt: Date;
  diagnosis?: string | null;
  items: Array<{
    drugName: string;
    presentation?: string | null;
    dose?: string | null;
    frequency?: string | null;
    duration?: string | null;
    instructions?: string | null;
  }>;
}) {
  if (!prescription.patientEmail) throw new HttpError(422, 'El paciente no tiene correo electrónico registrado');
  const cfg = await prisma.emailConfig.findFirst();
  if (!cfg || !cfg.user || !cfg.pass) throw new HttpError(422, 'Configuración SMTP incompleta');
  if (!cfg.enabled) throw new HttpError(422, 'El envío de correos está desactivado en la configuración');
  await doSendPrescriptionEmail(cfg, { ...prescription, patientEmail: prescription.patientEmail });
}
