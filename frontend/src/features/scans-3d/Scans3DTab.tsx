import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FileUploader } from '@/features/files/FileUploader';
import { useDeleteFile, useDownloadUrl, usePatientFiles } from '@/features/files/queries';
import type { PatientWithHistory } from '@/types/patient';
import type { MediaFile } from '@/types/file';
import { STLViewer } from './STLViewer';

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function Scans3DTab() {
  const { patient } = useOutletContext<{ patient: PatientWithHistory }>();
  const { data = [], isLoading, isError, error, refetch } = usePatientFiles(patient.id, 'STL_SCAN');
  const del = useDeleteFile(patient.id);
  const download = useDownloadUrl();
  const [selected, setSelected] = useState<{ file: MediaFile; url: string } | null>(null);

  async function pick(f: MediaFile) {
    const r = await download.mutateAsync(f.id);
    setSelected({ file: f, url: r.url });
  }

  return (
    <div className="space-y-6">
      <FileUploader patientId={patient.id} type="STL_SCAN" accept=".stl" label="Subir escaneo STL" multiple={false} />

      {isError ? (
        <ErrorState error={error} title="No se pudieron cargar los escaneos" onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="skeleton rounded-2xl h-32" />
      ) : data.length === 0 ? (
        <EmptyState title="Sin escaneos 3D" description="Sube archivos STL para visualizarlos." />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          <ul className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {data.map((f) => (
              <li key={f.id} className={selected?.file.id === f.id ? 'bg-primary/5' : ''}>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => pick(f)}
                    className="flex-1 text-left px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="text-sm font-medium truncate">{f.fileName}</div>
                    <div className="text-xs text-muted-foreground">{fmtSize(f.sizeBytes)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('¿Eliminar este escaneo?')) {
                        await del.mutateAsync(f.id);
                        if (selected?.file.id === f.id) setSelected(null);
                      }
                    }}
                    className="px-3 text-muted-foreground hover:text-danger"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div>
            {selected ? (
              <STLViewer key={selected.file.id} url={selected.url} fileName={selected.file.fileName} />
            ) : (
              <div className="h-[520px] rounded-2xl border border-dashed border-border grid place-items-center text-muted-foreground text-sm">
                Selecciona un escaneo para visualizarlo
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
