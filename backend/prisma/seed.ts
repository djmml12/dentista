import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';
import { MEDICATIONS } from './medications.data.js';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'admin123';

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`Usuario admin ya existe: ${username}`);
  } else {
    const passwordHash = await argon2.hash(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, name: 'Administrador', role: Role.ADMIN },
    });
    console.log(`Admin creado: ${user.username} / contraseña: ${password}`);
  }

  // Catálogo de medicamentos (idempotente).
  const meds = await prisma.medication.createMany({ data: MEDICATIONS, skipDuplicates: true });
  console.log(`Catálogo de medicamentos: ${meds.count} nuevo(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
