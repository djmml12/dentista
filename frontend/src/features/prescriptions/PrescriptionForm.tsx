import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { MedicationAutocomplete } from './MedicationAutocomplete';
import { useDentists } from '@/features/appointments/queries';
import { useAuth } from '@/features/auth/AuthContext';
import type { Prescription, PrescriptionInput } from '@/types/prescription';

interface RowItem {
  uid: string;
  drugName: string;
  presentation: string;
  dose: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions: string;
}

interface Props {
  initial?: Prescription;
  onSubmit: (data: PrescriptionInput) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string | null;
}

let uidSeq = 0;
const newRow = (): RowItem => ({
  uid: `row-${uidSeq++}`,
  drugName: '',
  presentation: '',
  dose: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
});

function todayInput(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PrescriptionForm({ initial, onSubmit, onCancel, submitting, error }: Props) {
  const { data: dentists = [] } = useDentists();
  const { user } = useAuth();
  const [prescriberId, setPrescriberId] = useState(initial?.prescriber.id ?? '');
  const [issuedAt, setIssuedAt] = useState(
    initial ? initial.issuedAt.slice(0, 10) : todayInput(),
  );
  const [diagnosis, setDiagnosis] = useState(initial?.diagnosis ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [rows, setRows] = useState<RowItem[]>(
    initial && initial.items.length > 0
      ? initial.items.map((it) => ({
          uid: `row-${uidSeq++}`,
          drugName: it.drugName,
          presentation: it.presentation ?? '',
          dose: it.dose ?? '',
          frequency: it.frequency ?? '',
          duration: it.duration ?? '',
          quantity: it.quantity ?? '',
          instructions: it.instructions ?? '',
        }))
      : [newRow()],
  );

  // Por defecto, el médico que prescribe es el usuario actual (si es dentista/admin).
  useEffect(() => {
    if (prescriberId || dentists.length === 0) return;
    const mine = dentists.find((d) => d.id === user?.id);
    setPrescriberId((mine ?? dentists[0]!).id);
  }, [dentists, prescriberId, user?.id]);

  function setRow(uid: string, patch: Partial<RowItem>) {
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  async function handle(e: FormEvent) {
    e.preventDefault();
    const items = rows
      .filter((r) => r.drugName.trim().length > 0)
      .map((r) => ({
        drugName: r.drugName.trim(),
        presentation: r.presentation.trim() || null,
        dose: r.dose.trim() || null,
        frequency: r.frequency.trim() || null,
        duration: r.duration.trim() || null,
        quantity: r.quantity.trim() || null,
        instructions: r.instructions.trim() || null,
      }));
    if (items.length === 0) return;
    await onSubmit({
      prescriberId,
      issuedAt: new Date(`${issuedAt}T12:00:00`).toISOString(),
      diagnosis: diagnosis.trim() || null,
      notes: notes.trim() || null,
      items,
    });
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Médico que prescribe *</span>
          <select
            value={prescriberId}
            onChange={(e) => setPrescriberId(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
          >
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Fecha *</span>
          <input
            type="date"
            required
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
          />
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">Diagnóstico</span>
        <input
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          maxLength={500}
          className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
        />
      </label>

      <div className="space-y-2">
        <span className="text-sm font-medium">Medicamentos *</span>
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.uid} className="rounded-xl border border-border p-3 space-y-2 motion-safe:animate-event-pop">
              <div className="flex items-start gap-2">
                <span className="mt-2 text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
                <div className="flex-1 space-y-2">
                  <MedicationAutocomplete
                    value={r.drugName}
                    onChange={(name) => setRow(r.uid, { drugName: name })}
                    onSelect={(m) =>
                      setRow(r.uid, { presentation: [m.form, m.strength].filter(Boolean).join(' ') })
                    }
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <input value={r.presentation} onChange={(e) => setRow(r.uid, { presentation: e.target.value })} placeholder="Presentación" className={cellCls} />
                    <input value={r.dose} onChange={(e) => setRow(r.uid, { dose: e.target.value })} placeholder="Dosis" className={cellCls} />
                    <input value={r.frequency} onChange={(e) => setRow(r.uid, { frequency: e.target.value })} placeholder="Frecuencia" className={cellCls} />
                    <input value={r.duration} onChange={(e) => setRow(r.uid, { duration: e.target.value })} placeholder="Duración" className={cellCls} />
                    <input value={r.quantity} onChange={(e) => setRow(r.uid, { quantity: e.target.value })} placeholder="Cantidad" className={cellCls} />
                    <input value={r.instructions} onChange={(e) => setRow(r.uid, { instructions: e.target.value })} placeholder="Indicaciones" className={`${cellCls} col-span-2 sm:col-span-3`} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.uid !== r.uid) : rs))}
                  disabled={rows.length === 1}
                  className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-danger disabled:opacity-40 active:scale-90"
                  aria-label="Quitar medicamento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setRows((rs) => [...rs, newRow()])}>
          <Plus className="h-4 w-4" /> Añadir medicamento
        </Button>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">Notas / indicaciones generales</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary/50"
        />
      </label>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancelar</Button>
        <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar receta'}</Button>
      </div>
    </form>
  );
}

const cellCls = 'h-9 rounded-lg border border-border bg-background px-2.5 text-sm transition-colors focus:border-primary/50';
