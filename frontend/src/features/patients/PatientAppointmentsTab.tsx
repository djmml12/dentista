import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { AppointmentForm } from '@/features/appointments/AppointmentForm';
import {
  useCreateAppointment,
  useDeleteAppointment,
  usePatientAppointments,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
} from '@/features/appointments/queries';
import { StatusQuickPicker } from '@/features/appointments/StatusQuickPicker';
import { STATUS_COLORS, STATUS_LABELS, type Appointment, type AppointmentInput } from '@/types/appointment';
import type { PatientWithHistory } from '@/types/patient';
import { ApiError } from '@/lib/api';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function PatientAppointmentsTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { data = [], isLoading, isError, error: loadError, refetch } = usePatientAppointments(patient.id);
  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const remove = useDeleteAppointment();
  const statusUpdate = useUpdateAppointmentStatus();
  const [modal, setModal] = useState<null | { type: 'create' } | { type: 'edit'; a: Appointment }>(null);
  const [error, setError] = useState<string | null>(null);

  const upcoming = data.filter((a) => new Date(a.startsAt) >= new Date());
  const past = data.filter((a) => new Date(a.startsAt) < new Date());

  async function submit(d: AppointmentInput) {
    setError(null);
    try {
      if (modal?.type === 'create') await create.mutateAsync(d);
      else if (modal?.type === 'edit') await update.mutateAsync({ id: modal.a.id, body: d });
      setModal(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    }
  }

  function row(a: Appointment) {
    return (
      <li key={a.id} className="group flex items-center gap-4 px-6 py-3 hover:bg-muted/50">
        <button
          type="button"
          onClick={() => { setError(null); setModal({ type: 'edit', a }); }}
          className="flex flex-1 min-w-0 items-center gap-4 text-left"
        >
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[a.status] }} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">{fmt(a.startsAt)}</div>
            <div className="text-xs text-muted-foreground truncate">
              {a.reason ?? 'Sin motivo'} · Dr. {a.dentist.name}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{STATUS_LABELS[a.status]}</span>
        </button>
        <span className="shrink-0">
          <StatusQuickPicker
            status={a.status}
            onChange={(s) => statusUpdate.mutateAsync({ id: a.id, status: s })}
            pending={statusUpdate.isPending && statusUpdate.variables?.id === a.id}
          />
        </span>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => { setError(null); setModal({ type: 'create' }); }}>
          <Plus className="h-4 w-4" /> Nueva cita
        </Button>
      </div>

      {isError ? (
        <ErrorState error={loadError} title="No se pudieron cargar las citas" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="rounded-2xl skeleton border border-border h-32" />
      ) : data.length === 0 ? (
        <EmptyState title="Sin citas" description="Este paciente todavía no tiene citas agendadas." />
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <header className="px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                Próximas
              </header>
              <ul className="divide-y divide-border">{upcoming.map(row)}</ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <header className="px-6 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                Pasadas
              </header>
              <ul className="divide-y divide-border">{past.map(row)}</ul>
            </section>
          )}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'create' ? 'Nueva cita' : 'Editar cita'}
        size="lg"
      >
        {modal && (
          <AppointmentForm
            initial={modal.type === 'edit' ? modal.a : undefined}
            lockPatient={{ id: patient.id, label: `${patient.firstName} ${patient.lastName}` }}
            onCancel={() => setModal(null)}
            onSubmit={submit}
            error={error}
            submitting={create.isPending || update.isPending}
            onDelete={
              modal.type === 'edit'
                ? async () => {
                    if (!confirm('¿Eliminar esta cita?')) return;
                    await remove.mutateAsync(modal.a.id);
                    setModal(null);
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </div>
  );
}
