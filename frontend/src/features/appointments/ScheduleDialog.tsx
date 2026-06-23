import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Clock, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { useDentists } from './queries';
import { listPatients } from '@/features/patients/patients.api';
import { STATUS_LABELS, type AppointmentInput, type AppointmentStatus } from '@/types/appointment';
import { useClinicConfig } from '@/features/settings/useClinicConfig';

interface Props {
  /** Día ya elegido en el calendario (la hora se elige aquí). */
  date: Date;
  onSubmit: (data: AppointmentInput) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  error?: string | null;
}

const SLOT_STEP = 30; // minutos
const DURATIONS = [30, 45, 60, 90] as const;

/** Lista de huecos "HH:MM" desde slotStart hasta slotEnd. */
function buildSlots(slotStart: number, slotEnd: number): { min: number; label: string }[] {
  const out: { min: number; label: string }[] = [];
  for (let m = slotStart * 60; m < slotEnd * 60; m += SLOT_STEP) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    out.push({ min: m, label: `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}` });
  }
  return out;
}

function atMinutes(day: Date, minOfDay: number): Date {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minOfDay);
  return d;
}

export function ScheduleDialog({ date, onSubmit, onCancel, submitting, error }: Props) {
  const { data: clinicCfg } = useClinicConfig();
  const slots = useMemo(
    () => buildSlots(clinicCfg?.workStart ?? 8, clinicCfg?.workEnd ?? 20),
    [clinicCfg?.workStart, clinicCfg?.workEnd],
  );
  const { data: dentists = [] } = useDentists();

  const [slotMin, setSlotMin] = useState<number | null>(null);
  const [duration, setDuration] = useState<number>(60);
  const [dentistId, setDentistId] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const [patientId, setPatientId] = useState('');
  const [patientLabel, setPatientLabel] = useState('');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (!dentistId && dentists.length > 0) setDentistId(dentists[0]!.id);
  }, [dentists, dentistId]);

  useEffect(() => {
    if (patientId || patientQuery.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    let cancelled = false;
    listPatients({ q: patientQuery, pageSize: 8 })
      .then((r) => {
        if (cancelled) return;
        setPatientResults(r.items.map((p) => ({ id: p.id, label: `${p.lastName}, ${p.firstName}` })));
      })
      .catch(() => setPatientResults([]));
    return () => {
      cancelled = true;
    };
  }, [patientQuery, patientId]);

  const dateLabel = useMemo(() => {
    const s = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [date]);

  const endLabel = useMemo(() => {
    if (slotMin == null) return null;
    const end = atMinutes(date, slotMin + duration);
    return end.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }, [slotMin, duration, date]);

  const canSave = slotMin != null && !!patientId && !!dentistId && !submitting;

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (slotMin == null || !patientId) return;
    await onSubmit({
      patientId,
      dentistId,
      startsAt: atMinutes(date, slotMin).toISOString(),
      endsAt: atMinutes(date, slotMin + duration).toISOString(),
      reason: reason.trim() || null,
      notes: notes.trim() || null,
      status,
    });
  }

  return (
    <form onSubmit={handle} className="space-y-5">
      {/* Día elegido */}
      <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
        <Clock className="h-4 w-4 shrink-0" />
        <span>{dateLabel}</span>
      </div>

      {/* Paso 1: hora */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">Hora *</span>
          {slotMin != null && endLabel && (
            <span className="text-xs text-muted-foreground">
              Termina a las <span className="font-medium text-foreground">{endLabel}</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {slots.map((s) => (
            <button
              key={s.min}
              type="button"
              onClick={() => setSlotMin(s.min)}
              className={cn(
                'rounded-lg border px-2 py-2 text-sm font-medium tabular-nums transition-all active:scale-95',
                slotMin === s.min
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duración */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Duración</span>
        <div className="flex flex-wrap gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-all active:scale-95',
                duration === d
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted',
              )}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Paso 2: paciente */}
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Paciente *</span>
        {patientId ? (
          <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
            <span className="font-medium">{patientLabel}</span>
            <button
              type="button"
              onClick={() => {
                setPatientId('');
                setPatientLabel('');
                setPatientQuery('');
              }}
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
              aria-label="Cambiar paciente"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar paciente por nombre..."
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
              />
            </div>
            {patientResults.length > 0 && (
              <ul className="max-h-44 overflow-auto rounded-xl border border-border bg-card text-sm">
                {patientResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPatientId(p.id);
                        setPatientLabel(p.label);
                        setPatientResults([]);
                      }}
                      className="w-full px-3 py-2 text-left transition-colors hover:bg-muted"
                    >
                      {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {patientQuery.trim().length >= 2 && patientResults.length === 0 && (
              <p className="px-1 text-xs text-muted-foreground">Sin resultados.</p>
            )}
          </>
        )}
      </div>

      {/* Datos complementarios */}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Dentista *</span>
          <select
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
            required
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Motivo</span>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Limpieza, revisión..." />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Notas</span>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
        />
      </label>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSave}>
          {submitting ? 'Guardando...' : 'Agendar cita'}
        </Button>
      </div>
    </form>
  );
}
