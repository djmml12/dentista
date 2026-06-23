import { useCallback, useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Camera, ChevronLeft, ChevronRight, Trash2, Upload, X, CalendarDays, AlignLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { useDeleteFile, useDownloadUrl, usePatientFiles } from '@/features/files/queries';
import { uploadFile } from '@/features/files/upload';
import { filesKeys } from '@/features/files/queries';
import type { MediaFile } from '@/types/file';
import type { PatientWithHistory } from '@/types/patient';
import { ApiError } from '@/lib/api';

// ── Staging: archivos seleccionados antes de subir ───────────────────────────

interface StagedFile {
  id: string;
  file: File;
  preview: string;
}

interface UploadPanelProps {
  patientId: string;
  onDone: () => void;
}

function UploadPanel({ patientId, onDone }: UploadPanelProps) {
  const qc = useQueryClient();
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [description, setDescription] = useState('');
  const [takenAt, setTakenAt] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const news: StagedFile[] = valid.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      preview: URL.createObjectURL(f),
    }));
    setStaged((prev) => [...prev, ...news]);
  }

  function remove(id: string) {
    setStaged((prev) => {
      const s = prev.find((x) => x.id === id);
      if (s) URL.revokeObjectURL(s.preview);
      return prev.filter((x) => x.id !== id);
    });
  }

  async function handleUpload() {
    if (staged.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < staged.length; i++) {
        setCurrent(i + 1);
        setProgress(0);
        const stagedFile = staged[i];
        if (!stagedFile) continue;
        await uploadFile({
          patientId,
          type: 'PHOTO',
          file: stagedFile.file,
          description: description.trim() || null,
          takenAt: takenAt ? new Date(takenAt).toISOString() : null,
          onProgress: setProgress,
        });
      }
      staged.forEach((s) => URL.revokeObjectURL(s.preview));
      setStaged([]);
      setDescription('');
      await qc.invalidateQueries({ queryKey: filesKeys.byPatient(patientId, 'PHOTO') });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
      setProgress(0);
      setCurrent(0);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => staged.length === 0 && inputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : staged.length === 0
            ? 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
            : 'border-border bg-muted/20'
        } p-6`}
      >
        {staged.length === 0 ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Camera className="h-8 w-8" />
            <p className="text-sm font-medium">Arrastra fotos aquí o haz clic para seleccionar</p>
            <p className="text-xs">JPG, PNG, WebP · máx. 20 MB por foto</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {staged.map((s) => (
                <div key={s.id} className="relative">
                  <img src={s.preview} className="h-20 w-20 object-cover rounded-xl border border-border" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); remove(s.id); }}
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-danger text-white flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Upload className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />

      {staged.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Fecha de toma
            </span>
            <input
              type="date"
              value={takenAt}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setTakenAt(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" /> Descripción <span className="text-muted-foreground font-normal">(opcional)</span>
            </span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Inicio tratamiento, Semana 4..."
              maxLength={200}
              className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50 focus:outline-none"
            />
          </label>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Subiendo foto {current} de {staged.length}…
          </p>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary origin-left transition-transform duration-150"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {staged.length > 0 && (
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => { staged.forEach((s) => URL.revokeObjectURL(s.preview)); setStaged([]); }} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            <Upload className="h-4 w-4" />
            {uploading ? 'Subiendo…' : `Subir ${staged.length} ${staged.length === 1 ? 'foto' : 'fotos'}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Tarjeta de foto ───────────────────────────────────────────────────────────

function PhotoCard({
  file,
  onOpen,
  onDelete,
  deleting,
}: {
  file: MediaFile;
  onOpen: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  const getUrl = useDownloadUrl();
  const [url, setUrl] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    let active = true;
    getUrl.mutateAsync(file.id).then((r) => { if (active) setUrl(r.url); }).catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const date = file.takenAt
    ? new Date(file.takenAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' })
    : new Date(file.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: '2-digit' });

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all">
      <button
        type="button"
        onClick={onOpen}
        className="relative block w-full aspect-[4/3] bg-muted overflow-hidden focus:outline-none"
      >
        {url ? (
          <img src={url} alt={file.description ?? file.fileName} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="skeleton h-full w-full" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </button>

      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {file.description && (
            <p className="text-sm font-medium truncate">{file.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
        </div>
        {confirmDel ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => { onDelete(); setConfirmDel(false); }}
              disabled={deleting}
              className="h-7 px-2 rounded-lg bg-danger text-white text-xs font-medium hover:bg-danger/90 transition-colors disabled:opacity-50"
            >
              {deleting ? '…' : 'Eliminar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDel(false)}
              className="h-7 px-2 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDel(true)}
            className="shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
            aria-label="Eliminar foto"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function PhotoLightbox({
  files,
  index,
  onClose,
  onNavigate,
  onDelete,
}: {
  files: MediaFile[];
  index: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
  onDelete: (id: string) => void;
}) {
  const file = files[index]!;
  const getUrl = useDownloadUrl();
  const [url, setUrl] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    setUrl(null);
    let active = true;
    getUrl.mutateAsync(file.id).then((r) => { if (active) setUrl(r.url); }).catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (e.key === 'ArrowRight' && index < files.length - 1) onNavigate(index + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNavigate, index, files.length]);

  const date = file.takenAt
    ? new Date(file.takenAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: '2-digit' })
    : new Date(file.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 text-white shrink-0">
        <span className="text-sm text-white/70">
          {index + 1} / {files.length}
        </span>
        <div className="flex items-center gap-1">
          {!confirmDel ? (
            <button
              type="button"
              onClick={() => setConfirmDel(true)}
              className="h-9 px-3 flex items-center gap-1.5 rounded-lg text-sm text-white/70 hover:text-danger hover:bg-white/10 transition-colors"
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/70">¿Eliminar?</span>
              <button
                type="button"
                onClick={() => { onDelete(file.id); setConfirmDel(false); }}
                className="h-8 px-3 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 transition-colors"
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDel(false)}
                className="h-8 px-3 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Imagen */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-16">
        {index > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(index - 1)}
            className="absolute left-3 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        <div className="flex items-center justify-center h-full w-full">
          {url ? (
            <img
              src={url}
              alt={file.description ?? file.fileName}
              className="max-h-full max-w-full object-contain rounded-lg"
              draggable={false}
            />
          ) : (
            <div className="h-64 w-64 skeleton rounded-xl" />
          )}
        </div>

        {index < files.length - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(index + 1)}
            className="absolute right-3 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Info */}
      <footer className="shrink-0 px-6 py-4 bg-black/60 text-white">
        <p className="font-medium">{file.description || file.fileName}</p>
        <p className="text-sm text-white/60 mt-0.5">{date}</p>

        {/* Miniaturas de navegación */}
        {files.length > 1 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {files.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onNavigate(i)}
                className={`h-10 w-10 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                  i === index ? 'border-primary' : 'border-white/20 hover:border-white/50'
                }`}
              >
                <ThumbImg fileId={f.id} />
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

function ThumbImg({ fileId }: { fileId: string }) {
  const getUrl = useDownloadUrl();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getUrl.mutateAsync(fileId).then((r) => { if (active) setUrl(r.url); }).catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);
  return url ? <img src={url} className="h-full w-full object-cover" /> : <div className="skeleton h-full w-full" />;
}

// ── Tab principal ─────────────────────────────────────────────────────────────

export function PatientPhotosTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { data: photos = [], isLoading, isError, error, refetch } = usePatientFiles(patient.id, 'PHOTO');
  const del = useDeleteFile(patient.id);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Ordenar por fecha de toma (desc)
  const sorted = [...photos].sort((a, b) => {
    const da = new Date(a.takenAt ?? a.createdAt).getTime();
    const db = new Date(b.takenAt ?? b.createdAt).getTime();
    return db - da;
  });

  async function handleDelete(id: string) {
    setDeleteError(null);
    setDeletingId(id);
    try {
      await del.mutateAsync(id);
      if (lightbox !== null) {
        const newLen = sorted.length - 1;
        if (newLen === 0) setLightbox(null);
        else setLightbox(Math.min(lightbox, newLen - 1));
      }
    } catch {
      setDeleteError('No se pudo eliminar la foto. Inténtalo de nuevo.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Fotografías clínicas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {photos.length === 0 ? 'Sin fotos' : `${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}`}
          </p>
        </div>
        <Button variant="secondary" onClick={() => setShowUpload((v) => !v)}>
          <Camera className="h-4 w-4" />
          {showUpload ? 'Cancelar' : 'Subir fotos'}
        </Button>
      </div>

      {/* Panel de subida */}
      {showUpload && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <UploadPanel patientId={patient.id} onDone={() => setShowUpload(false)} />
        </div>
      )}

      {/* Galería */}
      {isError ? (
        <ErrorState error={error} title="No se pudieron cargar las fotos" onRetry={refetch} />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border overflow-hidden">
              <div className="skeleton aspect-[4/3]" />
              <div className="p-3 space-y-1.5">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 && !showUpload ? (
        <EmptyState
          icon={<Camera className="h-10 w-10" />}
          title="Sin fotografías"
          description="Sube fotos para hacer seguimiento visual del progreso del tratamiento."
          action={
            <Button onClick={() => setShowUpload(true)}>
              <Camera className="h-4 w-4" /> Subir primera foto
            </Button>
          }
        />
      ) : sorted.length > 0 ? (
        <>
          {deleteError && (
            <p className="text-sm text-danger rounded-xl border border-danger/20 bg-danger/5 px-4 py-2">{deleteError}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sorted.map((f, i) => (
              <PhotoCard
                key={f.id}
                file={f}
                onOpen={() => setLightbox(i)}
                onDelete={() => handleDelete(f.id)}
                deleting={deletingId === f.id}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Lightbox */}
      {lightbox !== null && sorted.length > 0 && (
        <PhotoLightbox
          files={sorted}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onNavigate={setLightbox}
          onDelete={(id) => handleDelete(id)}
        />
      )}
    </div>
  );
}
