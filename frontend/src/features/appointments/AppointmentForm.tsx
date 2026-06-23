import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useDentists } from './queries';
import { listPatients } from '@/features/patients/patients.api';
import { STATUS_LABELS, type AppointmentInput, type AppointmentStatus } from '@/types/appointment';

interface Props {
  initial?: Partial<AppointmentInput> & { id?: string };
  lockPatient?: { id: string; label: string };
  onSubmit: (data: AppointmentInput) => Promise<void> | void;
  onCancel: () => void;
  onDelete?: () => Promise<void> | void;
  submitting?: boolean;
  error?: string | null;
}

function toLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

export function AppointmentForm({ initial, lockPatient, onSubmit, onCancel, onDelete, submitting, error }: Props) {
  const { data: dentists = [] } = useDentists();
  const [patientId, setPatientId] = useState(initial?.patientId ?? lockPatient?.id ?? '');
  const [dentistId, setDentistId] = useState(initial?.dentistId ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt));
  const [reason, setReason] = useState(initial?.reason ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<AppointmentStatus>(initial?.status ?? 'SCHEDULED');
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Array<{ id: string; label: string }>>([]);

  useEffect(() => {
    if (lockPatient) return;
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
  }, [patientQuery, patientId, lockPatient]);

  useEffect(() => {
    if (!dentistId && dentists.length > 0) setDentistId(dentists[0]!.id);
  }, [dentists, dentistId]);

  async function handle(e: FormEvent) {
    e.preventDefault();
    if (!patientId) return;
    await onSubmit({
      patientId,
      dentistId,
      startsAt: fromLocalInput(startsAt),
      endsAt: fromLocalInput(endsAt),
      reason: reason.trim() || null,
      notes: notes.trim() || null,
      status,
    });
  }

  return (
    <form onSubmit={handle} className="space-y-4">
      {lockPatient ? (
        <div className="rounded-xl bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Paciente: </span>
          <span className="font-medium">{lockPatient.label}</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Paciente *</span>
          {patientId ? (
            <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
              <span>
                {patientResults.find((p) => p.id === patientId)?.label ?? 'Paciente seleccionado'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setPatientId('');
                  setPatientQuery('');
                }}
                className="text-xs text-muted-foreground hover:text-danger"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <Input
                placeholder="Buscar paciente..."
                value={patientQuery}
                onChange={(e) => setPatientQuery(e.target.value)}
              />
              {patientResults.length > 0 && (
                <ul className="rounded-xl border border-border bg-card max-h-48 overflow-auto text-sm">
                  {patientResults.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setPatientId(p.id);
                          setPatientResults([{ id: p.id, label: p.label }]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted"
                      >
                        {p.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Dentista *</span>
          <select
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
            required
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Estado</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Inicio *</span>
          <Input type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </label>
        <label className="space-y-1.5 block">
          <span className="text-sm font-medium">Fin *</span>
          <Input type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">Motivo</span>
        <Input value={reason ?? ''} onChange={(e) => setReason(e.target.value)} maxLength={200} />
      </label>
      <label className="space-y-1.5 block">
        <span className="text-sm font-medium">Notas</span>
        <textarea
          rows={3}
          value={notes ?? ''}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
        />
      </label>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex justify-between gap-2">
        {onDelete ? (
          <Button type="button" variant="ghost" onClick={() => void onDelete()}>
            Eliminar
          </Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting || !patientId}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </form>
  );
}
