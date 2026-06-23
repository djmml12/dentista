-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EmailConfig" ADD COLUMN     "reminderHoursBefore" INTEGER NOT NULL DEFAULT 0;
