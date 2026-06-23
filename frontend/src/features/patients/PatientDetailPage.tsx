import { useRef, useState } from 'react';
import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { PatientForm } from './PatientForm';
import { useDeletePatient, usePatient, useUpdatePatient, useUploadPatientPhoto, useDeletePatientPhoto } from './queries';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiError } from '@/lib/api';

const tabs = [
  { to: '', label: 'Resumen', end: true },
  { to: 'citas', label: 'Citas' },
  { to: 'odontograma', label: 'Odontograma' },
  { to: 'notas', label: 'Notas clínicas' },
  { to: 'recetas', label: 'Recetas' },
  { to: 'cobros', label: 'Cobros' },
  { to: 'radiografias', label: 'Radiografías' },
  { to: 'fotografias', label: 'Fotografías' },
  { to: 'escaneos', label: 'Escaneos 3D' },
];

function PatientAvatar({
  firstName,
  lastName,
  photoUrl,
  onUpload,
  onDelete,
  uploading,
}: {
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();

  return (
    <div className="relative group shrink-0">
      {/* Avatar */}
      <div className="h-20 w-20 rounded-full overflow-hidden ring-2 ring-border bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${firstName} ${lastName}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-teal-700 dark:text-teal-300">{initials}</span>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Overlay con acciones */}
      {!uploading && (
        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
          <button
            type="button"
            title="Cambiar foto"
            onClick={() => inputRef.current?.click()}
            className="h-7 w-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-gray-800 transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
          {photoUrl && (
            <button
              type="button"
              title="Eliminar foto"
              onClick={onDelete}
              className="h-7 w-7 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-red-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePatient(id);
  const update = useUpdatePatient(id ?? '');
  const remove = useDeletePatient();
  const uploadPhoto = useUploadPatientPhoto(id ?? '');
  const deletePhoto = useDeletePatientPhoto(id ?? '');
  const { user } = useAuth();
  const canDelete = user?.role === 'ADMIN' || user?.role === 'DENTIST';
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 skeleton rounded" />
        <div className="h-32 skeleton rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/pacientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
          No se pudo cargar el paciente.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/pacientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pacientes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PatientAvatar
            firstName={data.firstName}
            lastName={data.lastName}
            photoUrl={data.photoUrl ?? null}
            uploading={uploadPhoto.isPending}
            onUpload={(file) => uploadPhoto.mutate(file)}
            onDelete={() => deletePhoto.mutate()}
          />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {data.firstName} {data.lastName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.documentId ? `Documento ${data.documentId} · ` : ''}
              {data.phone ?? 'Sin teléfono'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
          {canDelete && (
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4 text-danger" />
            </Button>
          )}
        </div>
      </div>

      <nav className="border-b border-border flex flex-wrap gap-1">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Outlet context={{ patient: data }} />

      <Modal
        open={editing}
        onClose={() => {
          setEditing(false);
          setEditError(null);
        }}
        title="Editar paciente"
        size="lg"
      >
        <PatientForm
          initial={data}
          onCancel={() => setEditing(false)}
          submitting={update.isPending}
          error={editError}
          onSubmit={async (payload) => {
            setEditError(null);
            try {
              await update.mutateAsync(payload);
              setEditing(false);
            } catch (err) {
              setEditError(err instanceof ApiError ? err.message : 'No se pudo guardar');
            }
          }}
        />
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar paciente"
        description="Esta acción no se puede deshacer y eliminará todos los datos clínicos asociados."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!id) return;
              await remove.mutateAsync(id);
              window.location.href = '/pacientes';
            }}
          >
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
