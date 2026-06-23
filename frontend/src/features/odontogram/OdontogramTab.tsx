import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ErrorState } from '@/components/ErrorState';
import { useAuth } from '@/features/auth/AuthContext';
import { useClearTooth, useOdontogram, useUpsertTooth } from './queries';
import {
  TOOTH_CONDITION_COLORS,
  TOOTH_CONDITION_LABELS,
  type ToothCondition,
  type ToothRecord,
} from '@/types/clinical';
import type { PatientWithHistory } from '@/types/patient';

// FDI: cuadrante 1 (sup. derecho, 18-11), 2 (sup. izq., 21-28),
// 4 (inf. derecho, 48-41), 3 (inf. izq., 31-38).
const UPPER = [
  [18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28],
] as const;
const LOWER = [
  [48, 47, 46, 45, 44, 43, 42, 41],
  [31, 32, 33, 34, 35, 36, 37, 38],
] as const;

function Tooth({
  number,
  condition,
  onClick,
  readOnly,
}: {
  number: number;
  condition: ToothCondition | null;
  onClick: () => void;
  readOnly?: boolean;
}) {
  // Diente sin condición: usa el color de tarjeta del tema (legible en claro y noche).
  // Los colores de condición son código clínico fijo, idénticos en ambos temas.
  const fill = condition ? TOOTH_CONDITION_COLORS[condition] : 'hsl(var(--card))';
  const isMissing = condition === 'MISSING' || condition === 'EXTRACTED';
  return (
    <button
      type="button"
      onClick={readOnly ? undefined : onClick}
      disabled={readOnly}
      className={`group flex flex-col items-center gap-1 focus:outline-none${readOnly ? ' cursor-default' : ''}`}
      aria-label={`Diente ${number}`}
    >
      <span className="text-[10px] text-muted-foreground tabular-nums">{number}</span>
      <svg width="34" height="44" viewBox="0 0 34 44" className="transition-transform group-hover:scale-110">
        <path
          d="M17 2 C 7 2, 3 12, 4 22 C 5 32, 9 42, 17 42 C 25 42, 29 32, 30 22 C 31 12, 27 2, 17 2 Z"
          fill={fill}
          stroke="hsl(var(--foreground))"
          strokeWidth="1.2"
          opacity={isMissing ? 0.35 : 1}
        />
        {isMissing && (
          <line x1="6" y1="6" x2="28" y2="38" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
        )}
      </svg>
    </button>
  );
}

export function OdontogramTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'DENTIST';
  const { data = [], isLoading, isError, error, refetch } = useOdontogram(patient.id);
  const upsert = useUpsertTooth(patient.id);
  const clear = useClearTooth(patient.id);

  const byNumber = useMemo(() => {
    const m = new Map<number, ToothRecord>();
    for (const r of data) m.set(r.toothNumber, r);
    return m;
  }, [data]);

  const [selected, setSelected] = useState<number | null>(null);
  const current = selected != null ? byNumber.get(selected) ?? null : null;
  const [condition, setCondition] = useState<ToothCondition>('HEALTHY');
  const [surface, setSurface] = useState('');
  const [notes, setNotes] = useState('');

  function open(number: number) {
    setSelected(number);
    const existing = byNumber.get(number);
    setCondition(existing?.condition ?? 'HEALTHY');
    setSurface(existing?.surface ?? '');
    setNotes(existing?.notes ?? '');
  }

  async function save() {
    if (selected == null) return;
    await upsert.mutateAsync({
      tooth: selected,
      body: { condition, surface: surface.trim() || null, notes: notes.trim() || null },
    });
    setSelected(null);
  }

  async function reset() {
    if (selected == null) return;
    await clear.mutateAsync(selected);
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 overflow-x-auto">
        {isError ? (
          <ErrorState error={error} title="No se pudo cargar el odontograma" onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="skeleton h-48 rounded-xl" />
        ) : (
          <div className="flex flex-col items-center gap-6 min-w-[640px]">
            <div className="flex gap-6">
              <div className="flex gap-1">
                {UPPER[0].map((n) => (
                  <Tooth key={n} number={n} condition={byNumber.get(n)?.condition ?? null} onClick={() => open(n)} readOnly={!canWrite} />
                ))}
              </div>
              <div className="w-px bg-border" />
              <div className="flex gap-1">
                {UPPER[1].map((n) => (
                  <Tooth key={n} number={n} condition={byNumber.get(n)?.condition ?? null} onClick={() => open(n)} readOnly={!canWrite} />
                ))}
              </div>
            </div>
            <div className="h-px w-full bg-border" />
            <div className="flex gap-6">
              <div className="flex gap-1">
                {LOWER[0].map((n) => (
                  <Tooth key={n} number={n} condition={byNumber.get(n)?.condition ?? null} onClick={() => open(n)} readOnly={!canWrite} />
                ))}
              </div>
              <div className="w-px bg-border" />
              <div className="flex gap-1">
                {LOWER[1].map((n) => (
                  <Tooth key={n} number={n} condition={byNumber.get(n)?.condition ?? null} onClick={() => open(n)} readOnly={!canWrite} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-medium mb-3">Leyenda</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(TOOTH_CONDITION_LABELS).map(([k, label]) => (
            <span key={k} className="inline-flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-sm border border-foreground/20"
                style={{ background: TOOTH_CONDITION_COLORS[k as ToothCondition] }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <Modal
        open={canWrite && selected != null}
        onClose={() => setSelected(null)}
        title={selected != null ? `Diente ${selected}` : ''}
        description="Notación FDI"
      >
        <div className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Condición</span>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as ToothCondition)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              {Object.entries(TOOTH_CONDITION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Superficie</span>
            <Input
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="oclusal, mesial, distal..."
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Notas</span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
            />
          </label>
          <div className="flex justify-between gap-2">
            {current ? (
              <Button variant="ghost" onClick={reset}>Limpiar estado</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button onClick={save} disabled={upsert.isPending}>
                {upsert.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
