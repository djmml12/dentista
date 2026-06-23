import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Printer, Pencil, Trash2, Pill, Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PrescriptionForm } from './PrescriptionForm';
import {
  useCreatePrescription,
  useDeletePrescription,
  usePrescriptions,
  useUpdatePrescription,
} from './queries';
import { emailPrescription } from './prescriptions.api';
import { useAuth } from '@/features/auth/AuthContext';
import type { PatientWithHistory } from '@/types/patient';
import type { Prescription, PrescriptionInput } from '@/types/prescription';
import { ApiError } from '@/lib/api';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function itemLine(it: Prescription['items'][number]): string {
  return [it.dose, it.frequency, it.duration].filter(Boolean).join(' · ');
}

export function PrescriptionsTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'DENTIST';
  const { data = [], isLoading, isError, error, refetch } = usePrescriptions(patient.id);
  const create = useCreatePrescription(patient.id);
  const update = useUpdatePrescription(patient.id);
  const del = useDeletePrescription(patient.id);

  const [modal, setModal] = useState<{ type: 'create' } | { type: 'edit'; rx: Prescription } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailState, setEmailState] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});

  async function handleSendEmail(rx: Prescription) {
    if (!rx.patient.email) {
      alert('Este paciente no tiene correo electrónico registrado en su ficha.');
      return;
    }
    setEmailState((s) => ({ ...s, [rx.id]: 'sending' }));
    try {
      await emailPrescription(rx.id);
      setEmailState((s) => ({ ...s, [rx.id]: 'sent' }));
      setTimeout(() => setEmailState((s) => { const n = { ...s }; delete n[rx.id]; return n; }), 3000);
    } catch (e) {
      setEmailState((s) => ({ ...s, [rx.id]: 'error' }));
      alert(e instanceof ApiError ? e.message : 'No se pudo enviar el correo');
      setTimeout(() => setEmailState((s) => { const n = { ...s }; delete n[rx.id]; return n; }), 3000);
    }
  }

  async function handleSubmit(body: PrescriptionInput) {
    setFormError(null);
    try {
      if (modal?.type === 'create') await create.mutateAsync(body);
      else if (modal?.type === 'edit') await update.mutateAsync({ id: modal.rx.id, body });
      setModal(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo guardar la receta');
    }
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => { setFormError(null); setModal({ type: 'create' }); }}>
            <Plus className="h-4 w-4" /> Nueva receta
          </Button>
        </div>
      )}

      {isError ? (
        <ErrorState error={error} title="No se pudieron cargar las recetas" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="skeleton rounded-2xl h-32" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Pill className="h-10 w-10" />}
          title="Sin recetas"
          description="Las recetas emitidas para este paciente aparecerán aquí."
        />
      ) : (
        <div className="space-y-4">
          {data.map((rx) => (
            <article key={rx.id} className="rounded-2xl border border-border bg-card p-5 motion-safe:animate-event-pop">
              <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-medium">{fmtDate(rx.issuedAt)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {rx.prescriber.name}
                    {rx.diagnosis ? ` · ${rx.diagnosis}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/recetas/${rx.id}/imprimir`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
                  >
                    <Printer className="h-4 w-4" /> Imprimir
                  </a>
                  <button
                    type="button"
                    onClick={() => handleSendEmail(rx)}
                    disabled={emailState[rx.id] === 'sending'}
                    title={rx.patient.email ? `Enviar a ${rx.patient.email}` : 'Sin correo registrado'}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {emailState[rx.id] === 'sending' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : emailState[rx.id] === 'sent' ? (
                      <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    {emailState[rx.id] === 'sent' ? 'Enviado' : 'Enviar'}
                  </button>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setFormError(null); setModal({ type: 'edit', rx }); }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => { if (confirm('¿Eliminar esta receta?')) await del.mutateAsync(rx.id); }}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-danger active:scale-90"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </header>

              <ol className="divide-y divide-border rounded-xl border border-border">
                {rx.items.map((it) => (
                  <li key={it.id} className="px-3 py-2 text-sm">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{it.drugName}</span>
                      {it.presentation && <span className="text-muted-foreground">{it.presentation}</span>}
                    </div>
                    {(itemLine(it) || it.instructions || it.quantity) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {[itemLine(it), it.quantity ? `Cant.: ${it.quantity}` : '', it.instructions]
                          .filter(Boolean)
                          .join(' — ')}
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {rx.notes && <p className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">{rx.notes}</p>}
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? 'Editar receta' : 'Nueva receta'}
        size="lg"
      >
        {modal && (
          <PrescriptionForm
            initial={modal.type === 'edit' ? modal.rx : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setModal(null)}
            submitting={create.isPending || update.isPending}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
