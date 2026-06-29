/**
 * seed-demo.ts
 * Genera 25 pacientes, citas (ene–may 2026), notas clínicas y estado financiero realista.
 */
import { PrismaClient, Role, AppointmentStatus, ReceiptStatus, BillableType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

// ── helpers ──────────────────────────────────────────────────────────────────

const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rnd(0, arr.length - 1)];
const pickN = <T>(arr: T[], n: number): T[] => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

function dateAt(month: number, day: number, hour: number, min = 0) {
  // month 1-based
  return new Date(2026, month - 1, day, hour, min, 0);
}

// Genera fechas de citas distribuidas en ene-may 2026.
// Más citas hacia feb-may (clínica "creciendo").
function appointmentDates(): { startsAt: Date; endsAt: Date }[] {
  const slots: { startsAt: Date; endsAt: Date }[] = [];
  // pesos por mes: ene=12, feb=18, mar=22, abr=25, may=25
  const monthConfig = [
    { m: 1, count: 12 },
    { m: 2, count: 18 },
    { m: 3, count: 22 },
    { m: 4, count: 25 },
    { m: 5, count: 25 },
  ];
  for (const { m, count } of monthConfig) {
    const maxDay = m === 2 ? 28 : [4, 6, 9, 11].includes(m) ? 30 : 31;
    for (let i = 0; i < count; i++) {
      let day = rnd(1, maxDay);
      // evitar domingos (0)
      const d = new Date(2026, m - 1, day);
      if (d.getDay() === 0) day = day > 1 ? day - 1 : day + 1;
      const hour = pick([8, 9, 10, 11, 12, 14, 15, 16, 17]);
      const durationMin = pick([30, 45, 60, 90]);
      const start = dateAt(m, day, hour);
      const end = new Date(start.getTime() + durationMin * 60_000);
      slots.push({ startsAt: start, endsAt: end });
    }
  }
  return slots;
}

// ── datos de muestra ──────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Carlos','María','José','Ana','Luis','Sofia','Jorge','Elena','Miguel','Laura',
  'Fernando','Gabriela','Roberto','Valentina','Alejandro','Isabella','Ricardo',
  'Daniela','Eduardo','Camila','Andrés','Paula','Diego','Natalia','Javier',
];
const LAST_NAMES = [
  'García','Rodríguez','López','Martínez','González','Pérez','Sánchez','Ramírez',
  'Torres','Flores','Morales','Jiménez','Hernández','Díaz','Cruz','Reyes',
  'Chávez','Moreno','Vargas','Castillo','Ramos','Mendoza','Ortega','Ruiz','Silva',
];

const REASONS = [
  'Dolor de muela','Limpieza dental','Revisión de rutina','Extracción','Endodoncia',
  'Blanqueamiento','Ortodoncia - ajuste','Colocación de corona','Implante dental',
  'Tratamiento de caries','Urgencia dental','Control post-operatorio',
  'Consulta de primera vez','Radiografía panorámica','Selladores dentales',
];

const DIAGNOSES = [
  'Caries interproximal','Pulpitis reversible','Enfermedad periodontal leve',
  'Bruxismo','Maloclusión clase I','Hipersensibilidad dentinal',
  'Fractura dental incompleta','Absceso periapical','Gingivitis generalizada',
  'Diente incluido','Desgaste oclusal','Pérdida ósea moderada',
];

const TREATMENTS = [
  'Obturación con resina compuesta','Extracción simple','Tratamiento de conductos',
  'Profilaxis y raspaje','Aplicación de flúor','Colocación de corona de porcelana',
  'Blanqueamiento con peróxido','Ajuste oclusal','Instalación de retenedor',
  'Cirugía periodontal','Implante en fase I','Antibioterapia y control',
];

const BILLABLE_ITEMS = [
  { name: 'Consulta general',         type: BillableType.SERVICE, price: 200  },
  { name: 'Limpieza dental',          type: BillableType.SERVICE, price: 450  },
  { name: 'Obturación simple',        type: BillableType.SERVICE, price: 350  },
  { name: 'Obturación compuesta',     type: BillableType.SERVICE, price: 550  },
  { name: 'Extracción simple',        type: BillableType.SERVICE, price: 600  },
  { name: 'Extracción quirúrgica',    type: BillableType.SERVICE, price: 1200 },
  { name: 'Endodoncia unirradicular', type: BillableType.SERVICE, price: 2500 },
  { name: 'Endodoncia multirradicular',type: BillableType.SERVICE, price: 3500 },
  { name: 'Corona de porcelana',      type: BillableType.SERVICE, price: 4500 },
  { name: 'Blanqueamiento dental',    type: BillableType.SERVICE, price: 1800 },
  { name: 'Radiografía periapical',   type: BillableType.SERVICE, price: 150  },
  { name: 'Radiografía panorámica',   type: BillableType.SERVICE, price: 350  },
  { name: 'Implante dental',          type: BillableType.SERVICE, price: 12000},
  { name: 'Profilaxis',               type: BillableType.SERVICE, price: 400  },
  { name: 'Sellador dental',          type: BillableType.SERVICE, price: 250  },
  { name: 'Resina fotocurable',       type: BillableType.SUPPLY,  price: 80   },
  { name: 'Anestesia local',          type: BillableType.SUPPLY,  price: 60   },
  { name: 'Hilo de sutura',           type: BillableType.SUPPLY,  price: 40   },
];

// ── lógica de estado de cita según fecha ─────────────────────────────────────

function appointmentStatus(startsAt: Date): AppointmentStatus {
  const now = new Date('2026-06-01');
  if (startsAt > now) return AppointmentStatus.SCHEDULED;
  const r = Math.random();
  if (r < 0.72) return AppointmentStatus.COMPLETED;
  if (r < 0.82) return AppointmentStatus.CANCELLED;
  if (r < 0.88) return AppointmentStatus.NO_SHOW;
  return AppointmentStatus.COMPLETED;
}

function receiptStatus(issuedAt: Date): ReceiptStatus {
  const month = issuedAt.getMonth() + 1;
  // mayo tiene más borradores (mes en curso simulado)
  if (month === 5 && Math.random() < 0.25) return ReceiptStatus.DRAFT;
  if (Math.random() < 0.08) return ReceiptStatus.CANCELLED;
  if (Math.random() < 0.85) return ReceiptStatus.PAID;
  return ReceiptStatus.ISSUED;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('▶ Creando dentistas de plantilla...');

  const dentistHash = await argon2.hash('dental123');
  const dentists = await Promise.all([
    prisma.user.upsert({
      where: { username: 'dra.garcia' },
      update: {},
      create: { username: 'dra.garcia', passwordHash: dentistHash, name: 'Dra. Carmen García', role: Role.DENTIST, specialty: 'Ortodoncia', licenseNumber: 'CDMX-3821' },
    }),
    prisma.user.upsert({
      where: { username: 'dr.morales' },
      update: {},
      create: { username: 'dr.morales', passwordHash: dentistHash, name: 'Dr. Héctor Morales', role: Role.DENTIST, specialty: 'Endodoncia', licenseNumber: 'CDMX-4107' },
    }),
  ]);
  console.log(`  ✔ ${dentists.length} dentistas listos`);

  console.log('▶ Creando catálogo de servicios...');
  await prisma.billableItem.createMany({ data: BILLABLE_ITEMS, skipDuplicates: true });
  const catalog = await prisma.billableItem.findMany();
  console.log(`  ✔ ${catalog.length} ítems en catálogo`);

  console.log('▶ Creando 25 pacientes...');
  const patients = await Promise.all(
    FIRST_NAMES.map((firstName, i) => {
      const lastName = LAST_NAMES[i];
      const birthYear = rnd(1960, 2005);
      return prisma.patient.create({
        data: {
          firstName,
          lastName,
          documentId: `ID${100000 + i}`,
          birthDate: new Date(birthYear, rnd(0, 11), rnd(1, 28)),
          sex: i % 3 === 0 ? 'M' : 'F',
          phone: `55${rnd(10000000, 99999999)}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
          medicalHistory: {
            create: {
              allergies: Math.random() > 0.6 ? [pick(['Penicilina', 'Ibuprofeno', 'Látex'])] : [],
              chronicConditions: Math.random() > 0.7 ? [pick(['Diabetes tipo 2', 'Hipertensión', 'Asma'])] : [],
              isDiabetic: Math.random() > 0.8,
              isSmoker: Math.random() > 0.75,
              bloodType: pick(['A+', 'B+', 'O+', 'O-', 'AB+']),
            },
          },
        },
      });
    })
  );
  console.log(`  ✔ ${patients.length} pacientes creados`);

  console.log('▶ Generando citas ene–may 2026...');
  const slots = appointmentDates();
  let apptCount = 0;
  let noteCount = 0;
  let receiptCount = 0;
  let totalRevenue = 0;

  for (const slot of slots) {
    const patient = pick(patients);
    const dentist = pick(dentists);
    const reason = pick(REASONS);
    const status = appointmentStatus(slot.startsAt);

    const appt = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        dentistId: dentist.id,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        status,
        reason,
        notes: Math.random() > 0.5 ? `Paciente refiere ${reason.toLowerCase()}` : null,
      },
    });
    apptCount++;

    // Nota clínica solo para citas completadas
    if (status === AppointmentStatus.COMPLETED) {
      await prisma.clinicalNote.create({
        data: {
          patientId: patient.id,
          appointmentId: appt.id,
          authorId: dentist.id,
          visitDate: slot.startsAt,
          procedure: reason,
          diagnosis: pick(DIAGNOSES),
          treatment: pick(TREATMENTS),
          observations: Math.random() > 0.4
            ? `Paciente cooperador. ${pick(['Sin complicaciones.', 'Se recomienda control en 3 meses.', 'Evolución favorable.', 'Requiere seguimiento.'])}`
            : null,
        },
      });
      noteCount++;

      // Recibo para citas completadas
      const numItems = rnd(1, 3);
      const items = pickN(catalog, numItems);
      const receiptSt = receiptStatus(slot.startsAt);

      const receipt = await prisma.receipt.create({
        data: {
          patientId: patient.id,
          createdById: dentist.id,
          status: receiptSt,
          issuedAt: new Date(slot.startsAt.getTime() + 30 * 60_000),
          items: {
            create: items.map((item, idx) => ({
              billableItemId: item.id,
              description: item.name,
              quantity: 1,
              unitPrice: item.price,
              order: idx,
            })),
          },
        },
      });
      receiptCount++;

      if (receiptSt === ReceiptStatus.PAID) {
        totalRevenue += items.reduce((s, it) => s + Number(it.price), 0);
      }
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           Resumen de datos generados             ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Pacientes        : ${String(patients.length).padEnd(28)}║`);
  console.log(`║  Dentistas        : ${String(dentists.length).padEnd(28)}║`);
  console.log(`║  Citas totales    : ${String(apptCount).padEnd(28)}║`);
  console.log(`║  Notas clínicas   : ${String(noteCount).padEnd(28)}║`);
  console.log(`║  Recibos emitidos : ${String(receiptCount).padEnd(28)}║`);
  console.log(`║  Ingresos cobrados: $${String(totalRevenue.toLocaleString('es-MX')).padEnd(27)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
