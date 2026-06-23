-- Autenticación por nombre de usuario en lugar de correo electrónico.
ALTER TABLE "User" RENAME COLUMN "email" TO "username";
ALTER INDEX "User_email_key" RENAME TO "User_username_key";

-- Migramos el admin sembrado: admin@dental.local -> admin (conserva su passwordHash).
UPDATE "User" SET "username" = 'admin' WHERE "username" = 'admin@dental.local';
