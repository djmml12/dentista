-- CreateTable
CREATE TABLE "ClinicConfig" (
    "id" TEXT NOT NULL,
    "workStart" INTEGER NOT NULL DEFAULT 8,
    "workEnd" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicConfig_pkey" PRIMARY KEY ("id")
);
