-- AlterTable: cambiar reminderHoursBefore de Int a Int[] en EmailConfig
ALTER TABLE "EmailConfig" DROP COLUMN "reminderHoursBefore";
ALTER TABLE "EmailConfig" ADD COLUMN "reminderHoursBefore" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- AlterTable: reemplazar reminderSentAt DateTime? por remindersSentHours Int[] en Appointment
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "reminderSentAt";
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "remindersSentHours" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
