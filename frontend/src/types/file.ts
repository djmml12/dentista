export type MediaType = 'RADIOGRAPH_2D' | 'DICOM' | 'STL_SCAN' | 'PHOTO' | 'DOCUMENT';

export interface MediaFile {
  id: string;
  patientId: string;
  uploadedById: string;
  type: MediaType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  thumbnailKey: string | null;
  description: string | null;
  takenAt: string | null;
  createdAt: string;
}

export interface PresignResponse {
  uploadUrl: string;
  storageKey: string;
  uploadToken: string;
}

export interface DownloadUrlResponse {
  url: string;
  file: MediaFile;
}

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  RADIOGRAPH_2D: 'Radiografía 2D',
  DICOM: 'DICOM / CBCT',
  STL_SCAN: 'Escaneo STL',
  PHOTO: 'Foto',
  DOCUMENT: 'Documento',
};
