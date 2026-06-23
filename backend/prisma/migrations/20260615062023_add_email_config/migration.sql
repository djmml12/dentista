-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "host" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "port" INTEGER NOT NULL DEFAULT 587,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "user" TEXT NOT NULL DEFAULT '',
    "pass" TEXT NOT NULL DEFAULT '',
    "fromName" TEXT NOT NULL DEFAULT 'Consultorio Dental',
    "fromEmail" TEXT NOT NULL DEFAULT '',
    "notifyAppointment" BOOLEAN NOT NULL DEFAULT true,
    "notifyPrescription" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);
