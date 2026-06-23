import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Pencil, CalendarClock } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { useCreateNote, useDeleteNote, usePatientNotes, useUpdateNote } from './queries';
import { usePatientAppointments } from '@/features/appointments/queries';
import { useAuth } from '@/features/auth/AuthContext';
import type { PatientWithHistory } from '@/types/patient';
import type { ClinicalNote, ClinicalNoteInput } from '@/types/clinical';
import { ApiError } from '@/lib/api';

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

interface FormState {
  visitDate: string;
  appointmentId: string;
  procedure: string;
  diagnosis: string;
  treatment: string;
  observations: string;
}
const emptyForm: FormState = { visitDate: '', appointmentId: '', procedure: '', diagnosis: '', treatment: '', observations: '' };

export function ClinicalNotesTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { user } = useAuth();
  const { data = [], isLoading, isError, error: loadError, refetch } = usePatientNotes(patient.id);
  const { data: appointments = [] } = usePatientAppointments(patient.id);
  const create = useCreateNote(patient.id);
  const update = useUpdateNote(patient.id);
  const del = useDeleteNote(patient.id);
  const canDelete = user?.role === 'ADMIN' || user?.role === 'DENTIST';

  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; note: ClinicalNote } | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setError(null);
    setForm(emptyForm);
    setModal({ type: 'create' });
  }
  function openEdit(note: ClinicalNote) {
    setError(null);
    setForm({
      visitDate: toDateInput(note.visitDate),
      appointmentId: note.appointmentId ?? '',
      procedure: note.procedure ?? '',
      diagnosis: note.diagnosis ?? '',
      treatment: note.treatment ?? '',
      observations: note.observations ?? '',
    });
    setModal({ type: 'edit', note });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: ClinicalNoteInput = {
      visitDate: form.visitDate ? new Date(`${form.visitDate}T12:00:00`).toISOString() : null,
      appointmentId: form.appointmentId || null,
      procedure: form.procedure.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      treatment: form.treatment.trim() || null,
      observations: form.observations.trim() || null,
    };
    try {
      if (modal?.type === 'edit') await update.mutateAsync({ id: modal.note.id, body });
      else await create.mutateAsync(body);
      setModal(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nueva nota
        </Button>
      </div>

      {isError ? (
        <ErrorState error={loadError} title="No se pudieron cargar las notas" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="rounded-2xl skeleton border border-border h-32" />
      ) : data.length === 0 ? (
        <EmptyState title="Sin notas" description="Las notas de evolución aparecerán aquí en orden cronológico." />
      ) : (
        <div className="relative pl-6 border-l border-border space-y-6">
          {data.map((n) => (
            <article key={n.id} className="relative motion-safe:animate-event-pop">
              <span className="absolute -left-[31px] top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
              <div className="rounded-2xl border border-border bg-card p-5">
                <header className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-medium">{n.procedure || 'Nota clínica'}</h3>
                    <p className="text-xs text-muted-foreground">
                      {n.visitDate ? `Visita ${fmtDay(n.visitDate)}` : fmtDateTime(n.createdAt)} · {n.author.name}
                    </p>
                    {n.appointment && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                        <CalendarClock className="h-3 w-3" />
                        Cita {fmtDay(n.appointment.startsAt)}
                        {n.appointment.reason ? ` · ${n.appointment.reason}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(n)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                      aria-label="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={async () => { if (confirm('¿Eliminar esta nota?')) await del.mutateAsync(n.id); }}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-danger active:scale-90"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </header>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {n.diagnosis && <Field label="Diagnóstico" value={n.diagnosis} />}
                  {n.treatment && <Field label="Tratamiento" value={n.treatment} />}
                  {n.observations && (
                    <div className="sm:col-span-2">
                      <Field label="Observaciones" value={n.observations} />
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? 'Editar nota clínica' : 'Nueva nota clínica'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Fecha de la visita</span>
              <input
                type="date"
                value={form.visitDate}
                onChange={(e) => setForm((f) => ({ ...f, visitDate: e.target.value }))}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
              />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Cita relacionada</span>
              <select
                value={form.appointmentId}
                onChange={(e) => setForm((f) => ({ ...f, appointmentId: e.target.value }))}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
              >
                <option value="">Sin cita</option>
                {appointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {fmtDay(a.startsAt)}{a.reason ? ` · ${a.reason}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Procedimiento</span>
            <Input
              value={form.procedure}
              onChange={(e) => setForm((f) => ({ ...f, procedure: e.target.value }))}
              placeholder="Ej. Limpieza dental"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Diagnóstico</span>
            <textarea
              rows={2}
              value={form.diagnosis}
              onChange={(e) => setForm((f) => ({ ...f, diagnosis: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Tratamiento</span>
            <textarea
              rows={3}
              value={form.treatment}
              onChange={(e) => setForm((f) => ({ ...f, treatment: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Observaciones</span>
            <textarea
              rows={3}
              value={form.observations}
              onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value}</div>
    </div>
  );
}
