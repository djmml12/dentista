import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { checkAndSendReminders } from './modules/email/email.service.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`API escuchando en http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Verificar recordatorios cada 30 minutos.
const REMINDER_INTERVAL_MS = 30 * 60 * 1000;
void checkAndSendReminders();
const reminderTimer = setInterval(() => void checkAndSendReminders(), REMINDER_INTERVAL_MS);
reminderTimer.unref();

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} recibido, cerrando…`);

  // Dejamos de aceptar conexiones nuevas y esperamos a que terminen las activas.
  const closed = new Promise<void>((resolve) => server.close(() => resolve()));
  // Red de seguridad: si alguna conexión se cuelga, forzamos la salida.
  const timeout = setTimeout(() => {
    console.error('Cierre forzado tras 10s de espera');
    process.exit(1);
  }, 10_000);
  timeout.unref();

  try {
    clearInterval(reminderTimer);
    await closed;
    await prisma.$disconnect();
    console.log('Cierre limpio completado');
    process.exit(0);
  } catch (err) {
    console.error('Error durante el cierre', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
