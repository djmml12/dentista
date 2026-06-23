import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { MedicalHistory, MedicalHistoryInput } from '@/types/patient';

interface Props {
  initial: MedicalHistory | null;
  onSubmit: (data: MedicalHistoryInput) => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

function ChipList({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (!v) return;
    if (value.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...value, v]);
    setDraft('');
  }
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
          >
            {item}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== item))}
              className="text-muted-foreground hover:text-danger"
              aria-label={`Quitar ${item}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="secondary" onClick={add}>
          Añadir
        </Button>
      </div>
    </div>
  );
}

export function MedicalHistoryForm({ initial, onSubmit, submitting, error }: Props) {
  const [allergies, setAllergies] = useState<string[]>(initial?.allergies ?? []);
  const [chronic, setChronic] = useState<string[]>(initial?.chronicConditions ?? []);
  const [meds, setMeds] = useState<string[]>(initial?.currentMedications ?? []);
  const [isPregnant, setIsPregnant] = useState(initial?.isPregnant ?? false);
  const [isSmoker, setIsSmoker] = useState(initial?.isSmoker ?? false);
  const [isDiabetic, setIsDiabetic] = useState(initial?.isDiabetic ?? false);
  const [bloodType, setBloodType] = useState(initial?.bloodType ?? '');
  const [freeText, setFreeText] = useState(initial?.freeText ?? '');

  async function handle(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      allergies,
      chronicConditions: chronic,
      currentMedications: meds,
      isPregnant,
      isSmoker,
      isDiabetic,
      bloodType: bloodType.trim() || null,
      freeText: freeText.trim() || null,
    });
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isPregnant} onChange={(e) => setIsPregnant(e.target.checked)} />
          Embarazo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isSmoker} onChange={(e) => setIsSmoker(e.target.checked)} />
          Fumador
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isDiabetic} onChange={(e) => setIsDiabetic(e.target.checked)} />
          Diabético
        </label>
      </div>
      <label className="block space-y-1.5 max-w-xs">
        <span className="text-sm font-medium">Tipo de sangre</span>
        <Input value={bloodType} onChange={(e) => setBloodType(e.target.value)} placeholder="O+, A−, ..." />
      </label>
      <ChipList label="Alergias" value={allergies} onChange={setAllergies} placeholder="Penicilina" />
      <ChipList label="Condiciones crónicas" value={chronic} onChange={setChronic} placeholder="Hipertensión" />
      <ChipList label="Medicación actual" value={meds} onChange={setMeds} placeholder="Losartán 50mg" />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Observaciones</span>
        <textarea
          rows={4}
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
        />
      </label>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar historial'}
        </Button>
      </div>
    </form>
  );
}
