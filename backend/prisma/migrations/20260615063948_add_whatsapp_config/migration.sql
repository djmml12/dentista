-- CreateTable
CREATE TABLE "WhatsappConfig" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumberId" TEXT NOT NULL DEFAULT '',
    "accessToken" TEXT NOT NULL DEFAULT '',
    "notifyAppointment" BOOLEAN NOT NULL DEFAULT true,
    "notifyPrescription" BOOLEAN NOT NULL DEFAULT true,
    "appointmentTemplateName" TEXT NOT NULL DEFAULT 'cita_dental',
    "prescriptionTemplateName" TEXT NOT NULL DEFAULT 'receta_dental',
    "templateLanguage" TEXT NOT NULL DEFAULT 'es_MX',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConfig_pkey" PRIMARY KEY ("id")
);
