import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { registerRequest } from './auth.api';
import { ApiError } from '@/lib/api';

type View = 'login' | 'register';

export function LoginPage() {
  const { status } = useAuth();
  const location = useLocation();
  const [view, setView] = useState<View>('login');

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={from} replace />;
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
          {view === 'login' ? (
            <LoginForm onRegister={() => setView('register')} />
          ) : (
            <RegisterForm onBack={() => setView('login')} />
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Uso interno del consultorio. Acceso restringido.
        </p>
      </div>
    </div>
  );
}

function LoginForm({ onRegister }: { onRegister: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <>
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
        <button
          type="button"
          onClick={onRegister}
          className="w-full h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Registrarse
        </button>
      </form>
    </>
  );
}

function RegisterForm({ onBack }: { onBack: () => void }) {
  const { login: loginAfterRegister } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerRequest({
        username,
        password,
        name,
        recoveryEmail: recoveryEmail.trim() || null,
      });
      await loginAfterRegister(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar el registro');
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Crear cuenta</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Completa los datos para registrarte en el sistema.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="reg-name" className="text-sm font-medium">Nombre completo</label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-username" className="text-sm font-medium">Usuario</label>
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
          />
          <p className="text-xs text-muted-foreground">Solo letras minúsculas, números, punto y guión.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-password" className="text-sm font-medium">Contraseña</label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
          />
          <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="reg-email" className="text-sm font-medium">
            Correo de recuperación
            <span className="ml-1 text-muted-foreground font-normal">(opcional)</span>
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={recoveryEmail}
            onChange={(e) => setRecoveryEmail(e.target.value)}
            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-sm focus:border-primary/50"
          />
          <p className="text-xs text-muted-foreground">Se usará para recuperar tu contraseña.</p>
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-colors"
        >
          {submitting ? 'Registrando...' : 'Crear cuenta'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="w-full h-10 rounded-xl border border-border bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Volver al inicio de sesión
        </button>
      </form>
    </>
  );
}
