import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, KeyRound, UserCheck, UserX, ShieldCheck, HeadphonesIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';
import { usersApi, type AppUser, type UserRole } from './users.api';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  ASSISTANT: 'Recepcionista',
};

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'ASSISTANT', label: 'Recepcionista' },
];

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        role === 'ADMIN'
          ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {role === 'ADMIN' ? <ShieldCheck className="h-3 w-3" /> : <HeadphonesIcon className="h-3 w-3" />}
      {ROLE_LABELS[role]}
    </span>
  );
}

type ModalMode = 'create' | 'edit' | 'password' | null;

interface FormState {
  name: string;
  username: string;
  password: string;
  role: UserRole;
}

const EMPTY_FORM: FormState = { name: '', username: '', password: '', role: 'ASSISTANT' };

export function UsersSection() {
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
  });

  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el usuario'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      usersApi.resetPassword(id, password),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); closeModal(); },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (err) => alert(err instanceof ApiError ? err.message : 'Error al cambiar estado'),
  });

  function openCreate() {
    setForm(EMPTY_FORM);
    setError(null);
    setMode('create');
  }

  function openEdit(u: AppUser) {
    setSelected(u);
    setForm({ name: u.name, username: u.username, password: '', role: u.role });
    setError(null);
    setMode('edit');
  }

  function openResetPassword(u: AppUser) {
    setSelected(u);
    setNewPassword('');
    setError(null);
    setMode('password');
  }

  function closeModal() {
    setMode(null);
    setSelected(null);
    setError(null);
  }

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      username: form.username.trim(),
      password: form.password,
      name: form.name.trim(),
      role: form.role,
    });
  }

  function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    updateMutation.mutate({
      id: selected.id,
      body: { name: form.name.trim(), role: form.role },
    });
  }

  function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    resetPasswordMutation.mutate({ id: selected.id, password: newPassword });
  }

  const isSelf = (u: AppUser) => u.id === currentUser?.id;
  const isBusy = createMutation.isPending || updateMutation.isPending || resetPasswordMutation.isPending;

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-danger">No se pudo cargar la lista de usuarios.</p>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Gestiona los accesos al consultorio. Solo los administradores pueden ver y modificar esta sección.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Nuevo usuario
          </Button>
        </div>

        {users.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay usuarios registrados.</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
            {users.map((u) => (
              <div
                key={u.id}
                className={cn(
                  'flex items-center gap-4 px-5 py-3.5 bg-card',
                  !u.isActive && 'opacity-50',
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{u.name}</span>
                    {isSelf(u) && (
                      <span className="text-xs text-muted-foreground">(tú)</span>
                    )}
                    {!u.isActive && (
                      <span className="text-xs text-muted-foreground">[inactivo]</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">@{u.username}</p>
                </div>

                <RoleBadge role={u.role} />

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    title="Editar"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openResetPassword(u)}
                    title="Cambiar contraseña"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  {!isSelf(u) && (
                    <button
                      type="button"
                      onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                      title={u.isActive ? 'Desactivar' : 'Activar'}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        u.isActive
                          ? 'text-muted-foreground hover:text-danger hover:bg-danger/10'
                          : 'text-muted-foreground hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20',
                      )}
                    >
                      {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: crear usuario */}
      <Modal open={mode === 'create'} onClose={closeModal} title="Nuevo usuario">
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Nombre completo *</span>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={120}
              placeholder="Nombre Apellido"
            />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Usuario *</span>
            <Input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))}
              required
              minLength={3}
              maxLength={60}
              placeholder="usuario"
              autoComplete="username"
            />
            <p className="text-xs text-muted-foreground">Solo minúsculas, números, punto, guión y guión bajo.</p>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Contraseña *</span>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Rol *</span>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" disabled={isBusy || !form.name.trim() || !form.username.trim() || !form.password}>
              {isBusy ? 'Creando…' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: editar usuario */}
      <Modal open={mode === 'edit'} onClose={closeModal} title="Editar usuario">
        <form onSubmit={handleEdit} className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Nombre completo *</span>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              maxLength={120}
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-medium">Usuario</span>
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">@{selected?.username}</p>
          </div>
          {selected && !isSelf(selected) && (
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Rol *</span>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" disabled={isBusy || !form.name.trim()}>
              {isBusy ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: cambiar contraseña */}
      <Modal open={mode === 'password'} onClose={closeModal} title={`Cambiar contraseña — ${selected?.name}`}>
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La sesión activa de <strong>{selected?.name}</strong> se cerrará automáticamente al cambiar la contraseña.
          </p>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Nueva contraseña *</span>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
          </label>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={closeModal} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" disabled={isBusy || newPassword.length < 6}>
              {isBusy ? 'Guardando…' : 'Cambiar contraseña'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
