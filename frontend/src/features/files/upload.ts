import * as filesApi from './files.api';
import type { MediaFile, MediaType } from '@/types/file';

export async function uploadFile(params: {
  patientId: string;
  type: MediaType;
  file: File;
  description?: string | null;
  takenAt?: string | null;
  onProgress?: (pct: number) => void;
}): Promise<MediaFile> {
  const { patientId, type, file, description, takenAt, onProgress } = params;

  const presign = await filesApi.presignUpload({
    patientId,
    type,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', presign.uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Subida falló (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Error de red durante la subida'));
    xhr.send(file);
  });

  return filesApi.confirmUpload({
    uploadToken: presign.uploadToken,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    description: description ?? null,
    takenAt: takenAt ?? null,
  });
}
