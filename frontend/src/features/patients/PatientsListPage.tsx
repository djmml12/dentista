import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Search, Phone, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { PatientForm } from './PatientForm';
import { useCreatePatient, usePatientsList } from './queries';
import { ApiError } from '@/lib/api';
import type { PatientListItem } from '@/types/patient';

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

function calcAge(birth: string | null): string {
  if (!birth) return '';
  const d = new Date(birth);
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return age >= 0 ? `${age} años` : '';
}

function PatientAvatar({ patient }: { patient: PatientListItem }) {
  const initials = `${patient.firstName[0] ?? ''}${patient.lastName[0] ?? ''}`.toUpperCase();
  if (patient.photoUrl) {
    return (
      <img
        src={patient.photoUrl}
        alt={`${patient.firstName} ${patient.lastName}`}
        className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-border"
      />
    );
  }
  return (
    <div className="h-14 w-14 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center text-lg font-semibold shrink-0 ring-2 ring-border">
      {initials}
    </div>
  );
}

function PatientCard({ patient }: { patient: PatientListItem }) {
  const age = calcAge(patient.birthDate);

  return (
    <Link
      to={`/pacientes/${patient.id}`}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all duration-150"
    >
      <PatientAvatar patient={patient} />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-base leading-snug truncate group-hover:text-primary transition-colors">
              {patient.firstName} {patient.lastName}
            </p>
            {age && (
              <p className="text-xs text-muted-foreground mt-0.5">{age}</p>
            )}
          </div>
          <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
            Ver ficha →
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {patient.phone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="truncate">{patient.phone}</span>
            </div>
          )}
          {patient.documentId && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">{patient.documentId}</span>
            </div>
          )}
          {patient.birthDate && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {new Date(patient.birthDate).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 animate-pulse">
      <div className="h-14 w-14 rounded-full bg-muted shrink-0" />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="h-4 w-36 bg-muted rounded" />
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="h-3 w-28 bg-muted rounded" />
      </div>
    </div>
  );
}

export function PatientsListPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlQ = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(urlQ);
  const [page, setPage] = useState(1);
  const q = useDebounced(search, 250);
  const { data, isLoading, isError, error, refetch } = usePatientsList(q, page);

  // Sync local search when URL param changes (e.g. from Topbar)
  useEffect(() => {
    setSearch(urlQ);
    setPage(1);
  }, [urlQ]);
  const [open, setOpen] = useState(false);
  const create = useCreatePatient();
  const [formError, setFormError] = useState<string | null>(null);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {data ? `${data.total} ${data.total === 1 ? 'paciente' : 'pacientes'}` : 'Cargando...'}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nuevo paciente
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            setPage(1);
            const params = new URLSearchParams();
            if (val.trim()) params.set('q', val.trim());
            navigate(`/pacientes${params.toString() ? `?${params}` : ''}`, { replace: true });
          }}
          placeholder="Buscar por nombre, documento o teléfono..."
          className="w-full h-10 rounded-xl border border-border bg-background pl-10 pr-3 text-sm focus:border-primary/50 focus:outline-none"
        />
      </div>

      {isError ? (
        <ErrorState error={error} title="No se pudieron cargar los pacientes" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
          title="Sin pacientes"
          description={q ? 'No hay resultados para esta búsqueda.' : 'Crea el primer paciente del consultorio.'}
          action={
            !q ? (
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> Nuevo paciente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.items.map((p) => (
            <PatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setFormError(null);
        }}
        title="Nuevo paciente"
        description="Completa los datos básicos. Podrás añadir historial médico desde la ficha."
        size="lg"
      >
        <PatientForm
          onCancel={() => {
            setOpen(false);
            setFormError(null);
          }}
          submitting={create.isPending}
          error={formError}
          onSubmit={async (data) => {
            setFormError(null);
            try {
              await create.mutateAsync(data);
              setOpen(false);
            } catch (err) {
              setFormError(err instanceof ApiError ? err.message : 'No se pudo crear el paciente');
            }
          }}
        />
      </Modal>
    </div>
  );
}
