import { PrismaClient } from '@prisma/client';
import { MEDICATIONS } from './medications.data.js';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.medication.createMany({ data: MEDICATIONS, skipDuplicates: true });
  const total = await prisma.medication.count();
  console.log(`Medicamentos insertados: ${result.count} (catálogo total: ${total}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
