import { api } from '@/lib/api';

export type Role = 'ADMIN' | 'DENTIST' | 'ASSISTANT';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  licenseNumber: string | null;
  specialty: string | null;
  recoveryEmail: string | null;
}

export interface ProfileInput {
  name?: string;
  licenseNumber?: string | null;
  specialty?: string | null;
  recoveryEmail?: string | null;
}

export interface RegisterInput {
  username: string;
  password: string;
  name: string;
  recoveryEmail?: string | null;
}

interface SessionResponse {
  accessToken: string;
  user: AuthUser;
}

export function loginRequest(username: string, password: string) {
  return api<SessionResponse>('/auth/login', {
    method: 'POST',
    body: { username, password },
    auth: false,
  });
}

export function refreshRequest() {
  return api<SessionResponse>('/auth/refresh', {
    method: 'POST',
    auth: false,
  });
}

export function logoutRequest() {
  return api<{ ok: true }>('/auth/logout', { method: 'POST', auth: false });
}

export function registerRequest(body: RegisterInput) {
  return api<SessionResponse>('/auth/register', {
    method: 'POST',
    body,
    auth: false,
  });
}

export function updateProfileRequest(body: ProfileInput) {
  return api<{ user: AuthUser }>('/auth/me', { method: 'PATCH', body });
}
