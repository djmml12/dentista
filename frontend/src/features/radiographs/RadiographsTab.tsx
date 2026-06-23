import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FileUploader } from '@/features/files/FileUploader';
import { useDeleteFile, useDownloadUrl, usePatientFiles } from '@/features/files/queries';
import type { PatientWithHistory } from '@/types/patient';
import type { MediaFile } from '@/types/file';
import { Lightbox } from './Lightbox';
import { DicomViewer } from './DicomViewer';

function isDicom(f: MediaFile) {
  return f.type === 'DICOM' || f.mimeType === 'application/dicom' || f.fileName.toLowerCase().endsWith('.dcm');
}

function Thumb({ file, onOpen }: { file: MediaFile; onOpen: (f: MediaFile) => void }) {
  const download = useDownloadUrl();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!isDicom(file)) {
      download.mutateAsync(file.id).then((r) => { if (active) setUrl(r.url); }).catch(() => {});
    }
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return (
    <button
      type="button"
      onClick={() => onOpen(file)}
      className="group relative aspect-square rounded-xl border border-border bg-card overflow-hidden hover:ring-2 hover:ring-primary/40 focus:outline-none"
    >
      {isDicom(file) ? (
        <div className="h-full w-full grid place-items-center text-xs font-medium text-muted-foreground bg-muted/40">
          DICOM
        </div>
      ) : url ? (
        <img src={url} alt={file.fileName} className="h-full w-full object-cover" />
      ) : (
        <div className="skeleton h-full w-full" />
      )}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[11px] truncate">
        {file.fileName}
      </div>
    </button>
  );
}

export function RadiographsTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const imgsQuery = usePatientFiles(patient.id, 'RADIOGRAPH_2D');
  const dicomsQuery = usePatientFiles(patient.id, 'DICOM');
  const { data: imgs = [], isLoading } = imgsQuery;
  const { data: dicoms = [] } = dicomsQuery;
  const isError = imgsQuery.isError || dicomsQuery.isError;
  const error = imgsQuery.error ?? dicomsQuery.error;
  const files = [...imgs, ...dicoms];
  const del = useDeleteFile(patient.id);
  const download = useDownloadUrl();

  const [viewing, setViewing] = useState<{ file: MediaFile; url: string } | null>(null);

  async function open(f: MediaFile) {
    if (isDicom(f)) {
      const r = await download.mutateAsync(f.id);
      setViewing({ file: f, url: r.url });
    } else {
      const r = await download.mutateAsync(f.id);
      setViewing({ file: f, url: r.url });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileUploader patientId={patient.id} type="RADIOGRAPH_2D" accept="image/*" label="Subir radiografía 2D" />
        <FileUploader patientId={patient.id} type="DICOM" accept=".dcm,application/dicom" label="Subir DICOM" multiple={false} />
      </div>

      {isError ? (
        <ErrorState
          error={error}
          title="No se pudieron cargar las imágenes"
          onRetry={() => {
            imgsQuery.refetch();
            dicomsQuery.refetch();
          }}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState title="Sin radiografías" description="Sube imágenes 2D o archivos DICOM." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {files.map((f) => (
            <div key={f.id} className="relative">
              <Thumb file={f} onOpen={open} />
              <button
                type="button"
                onClick={async () => {
                  if (confirm('¿Eliminar este archivo?')) await del.mutateAsync(f.id);
                }}
                className="absolute top-2 right-2 h-7 w-7 grid place-items-center rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition"
                aria-label="Eliminar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        isDicom(viewing.file) ? (
          <DicomViewer url={viewing.url} fileName={viewing.file.fileName} onClose={() => setViewing(null)} />
        ) : (
          <Lightbox url={viewing.url} fileName={viewing.file.fileName} onClose={() => setViewing(null)} />
        )
      )}
    </div>
  );
}
