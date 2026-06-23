import { api } from '@/lib/api';

export type UserRole = 'ADMIN' | 'ASSISTANT';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export const usersApi = {
  list: () => api<{ users: AppUser[] }>('/users').then((d) => d.users),

  create: (body: { username: string; password: string; name: string; role: UserRole }) =>
    api<{ user: AppUser }>('/users', { method: 'POST', body }).then((d) => d.user),

  update: (id: string, body: { name?: string; role?: UserRole; isActive?: boolean }) =>
    api<{ user: AppUser }>(`/users/${id}`, { method: 'PATCH', body }).then((d) => d.user),

  resetPassword: (id: string, password: string) =>
    api<{ ok: boolean }>(`/users/${id}/reset-password`, { method: 'POST', body: { password } }),
};
