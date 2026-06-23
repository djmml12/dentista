// Catálogo base de medicamentos de uso odontológico frecuente.
export const MEDICATIONS: Array<{ name: string; form: string; strength: string }> = [
  // Analgésicos / AINEs
  { name: 'Paracetamol', form: 'Tableta', strength: '500 mg' },
  { name: 'Paracetamol', form: 'Tableta', strength: '750 mg' },
  { name: 'Ibuprofeno', form: 'Tableta', strength: '400 mg' },
  { name: 'Ibuprofeno', form: 'Tableta', strength: '600 mg' },
  { name: 'Naproxeno', form: 'Tableta', strength: '250 mg' },
  { name: 'Naproxeno', form: 'Tableta', strength: '500 mg' },
  { name: 'Ketorolaco', form: 'Tableta', strength: '10 mg' },
  { name: 'Diclofenaco', form: 'Tableta', strength: '50 mg' },
  { name: 'Metamizol sódico', form: 'Tableta', strength: '500 mg' },
  // Antibióticos
  { name: 'Amoxicilina', form: 'Cápsula', strength: '500 mg' },
  { name: 'Amoxicilina/Ácido clavulánico', form: 'Tableta', strength: '875/125 mg' },
  { name: 'Clindamicina', form: 'Cápsula', strength: '300 mg' },
  { name: 'Metronidazol', form: 'Tableta', strength: '500 mg' },
  { name: 'Azitromicina', form: 'Tableta', strength: '500 mg' },
  { name: 'Cefalexina', form: 'Cápsula', strength: '500 mg' },
  { name: 'Eritromicina', form: 'Tableta', strength: '500 mg' },
  // Corticoide / antimicótico
  { name: 'Dexametasona', form: 'Tableta', strength: '0.5 mg' },
  { name: 'Nistatina', form: 'Suspensión', strength: '100 000 U/mL' },
  // Tópicos / enjuagues
  { name: 'Clorhexidina', form: 'Enjuague bucal', strength: '0.12%' },
  { name: 'Bencidamina', form: 'Enjuague bucal', strength: '0.15%' },
];
