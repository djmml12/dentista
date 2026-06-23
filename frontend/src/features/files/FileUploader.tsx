import { useState } from 'react';
import { Upload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { uploadFile } from './upload';
import type { MediaType } from '@/types/file';
import { ApiError } from '@/lib/api';

interface Props {
  patientId: string;
  type: MediaType;
  accept?: string;
  label?: string;
  multiple?: boolean;
}

export function FileUploader({ patientId, type, accept, label = 'Subir archivos', multiple = true }: Props) {
  const qc = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      for (const file of Array.from(files)) {
        setProgress(0);
        await uploadFile({ patientId, type, file, onProgress: setProgress });
      }
      await qc.invalidateQueries({ queryKey: ['files', patientId], exact: false });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Subida fallida');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 cursor-pointer transition-colors w-fit">
        <Upload className="h-4 w-4" /> {label}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => handle(e.target.files)}
          disabled={progress !== null}
        />
      </label>
      {progress !== null && (
        <div className="h-1.5 w-48 rounded-full bg-muted overflow-hidden">
          {/* Animamos scaleX en vez de width: corre en el compositor (60FPS). */}
          <div
            className="h-full w-full origin-left bg-primary transition-transform duration-150 ease-out"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>
      )}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
