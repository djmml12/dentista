import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { MedicalHistoryForm } from './MedicalHistoryForm';
import { useMedicalHistory, useSaveMedicalHistory } from './queries';
import { QuickNotesPanel } from '@/features/quick-notes/QuickNotesPanel';
import { useAuth } from '@/features/auth/AuthContext';
import type { PatientWithHistory } from '@/types/patient';
import { ApiError } from '@/lib/api';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '—';
  }
}

function calcAge(birth: string | null): string {
  if (!birth) return '—';
  const d = new Date(birth);
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 ? `${age} años` : '—';
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm mt-1">{value && value.length > 0 ? value : '—'}</div>
    </div>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PatientSummaryTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'DENTIST';
  const { data: history } = useMedicalHistory(patient.id);
  const save = useSaveMedicalHistory(patient.id);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <QuickNotesPanel patientId={patient.id} />
      </div>

      <Card title="Datos personales">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Nombre" value={`${patient.firstName} ${patient.lastName}`} />
          <Field label="Documento" value={patient.documentId} />
          <Field label="Nacimiento" value={`${formatDate(patient.birthDate)} (${calcAge(patient.birthDate)})`} />
          <Field label="Sexo" value={patient.sex} />
          <Field label="Teléfono" value={patient.phone} />
          <Field label="Correo" value={patient.email} />
          <div className="col-span-2">
            <Field label="Dirección" value={patient.address} />
          </div>
          <Field label="Contacto emergencia" value={patient.emergencyContactName} />
          <Field label="Teléfono emergencia" value={patient.emergencyContactPhone} />
          {patient.notes && (
            <div className="col-span-2">
              <Field label="Notas" value={patient.notes} />
            </div>
          )}
        </dl>
      </Card>

      <Card
        title="Historial médico"
        action={
          canWrite ? (
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          ) : undefined
        }
      >
        {!history ? (
          <p className="text-sm text-muted-foreground">
            Sin historial registrado. Pulsa <strong>Editar</strong> para añadirlo.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {history.isPregnant && <span className="rounded-full bg-warning/10 text-warning px-3 py-1 text-xs">Embarazo</span>}
              {history.isSmoker && <span className="rounded-full bg-muted px-3 py-1 text-xs">Fumador</span>}
              {history.isDiabetic && <span className="rounded-full bg-muted px-3 py-1 text-xs">Diabético</span>}
              {history.bloodType && (
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs">
                  Sangre {history.bloodType}
                </span>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Alergias</div>
                {history.allergies.length === 0 ? (
                  <span className="text-muted-foreground">Sin registradas</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {history.allergies.map((a) => (
                      <span key={a} className="rounded-full bg-danger/10 text-danger px-2.5 py-0.5 text-xs">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Condiciones crónicas</div>
                {history.chronicConditions.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {history.chronicConditions.map((a) => (
                      <span key={a} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Medicación actual</div>
                {history.currentMedications.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {history.currentMedications.map((a) => (
                      <span key={a} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">{a}</span>
                    ))}
                  </div>
                )}
              </div>
              {history.freeText && <Field label="Observaciones" value={history.freeText} />}
            </div>
          </div>
        )}
      </Card>

      {canWrite && (
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            setErr(null);
          }}
          title="Historial médico"
          size="lg"
        >
          <MedicalHistoryForm
            initial={history ?? null}
            submitting={save.isPending}
            error={err}
            onSubmit={async (data) => {
              setErr(null);
              try {
                await save.mutateAsync(data);
                setOpen(false);
              } catch (e) {
                setErr(e instanceof ApiError ? e.message : 'No se pudo guardar');
              }
            }}
          />
        </Modal>
      )}
    </div>
  );
}
