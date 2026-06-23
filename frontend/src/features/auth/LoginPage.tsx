import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '@/lib/api';

export function LoginPage() {
  const { login, status } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full grid place-items-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center">
            <span className="text-primary font-semibold">D</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Consultorio Dental</span>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-card p-7">
          <h1 className="text-xl font-semibold tracking-tight">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accede con las credenciales del consultorio.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium">Usuario</label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
              />
            </div>
            {error && (
              <p className="text-sm text-danger" role="alert">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Uso interno del consultorio. Acceso restringido.
        </p>
      </div>
    </div>
  );
}
