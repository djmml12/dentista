import { api } from '@/lib/api';
import type { DownloadUrlResponse, MediaFile, MediaType, PresignResponse } from '@/types/file';

export const presignUpload = (body: {
  patientId: string;
  type: MediaType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}) => api<PresignResponse>('/files/presign', { method: 'POST', body });

export const confirmUpload = (body: {
  uploadToken: string;
  fileName: string;
  mimeType: string;
  description?: string | null;
  takenAt?: string | null;
}) => api<MediaFile>('/files/confirm', { method: 'POST', body });

export const listPatientFiles = (patientId: string, type?: MediaType) => {
  const qs = type ? `?type=${type}` : '';
  return api<MediaFile[]>(`/patients/${patientId}/files${qs}`);
};

export const getDownloadUrl = (id: string) => api<DownloadUrlResponse>(`/files/${id}/download-url`);

export const deleteFile = (id: string) => api<void>(`/files/${id}`, { method: 'DELETE' });
