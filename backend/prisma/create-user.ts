import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const username = 'djmm';
  const password = 'admin';
  const role = Role.ADMIN;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    const updated = await prisma.user.update({
      where: { username },
      data: { passwordHash: await argon2.hash(password), role, isActive: true },
    });
    console.log(`Usuario actualizado: ${updated.username} | rol: ${updated.role}`);
  } else {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await argon2.hash(password),
        name: 'djmm',
        role,
      },
    });
    console.log(`Usuario creado: ${user.username} | rol: ${user.role}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
