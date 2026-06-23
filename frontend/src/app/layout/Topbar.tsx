import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface Props {
  /** Abre el sidebar como drawer en móvil. */
  onMenu: () => void;
}

export function Topbar({ onMenu }: Props) {
  const { user, logout } = useAuth();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input value when navigating away from /pacientes
  useEffect(() => {
    if (!location.pathname.startsWith('/pacientes') || location.pathname !== '/pacientes') {
      setValue('');
    } else {
      const q = new URLSearchParams(location.search).get('q') ?? '';
      setValue(q);
    }
  }, [location.pathname, location.search]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setValue(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      navigate(`/pacientes${params.toString() ? `?${params}` : ''}`);
    }, 250);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const params = new URLSearchParams();
    if (value.trim()) params.set('q', value.trim());
    navigate(`/pacientes${params.toString() ? `?${params}` : ''}`);
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/60 px-3 backdrop-blur sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted active:scale-90 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form onSubmit={handleSubmit} className="relative min-w-0 flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={value}
          onChange={handleChange}
          placeholder="Buscar pacientes..."
          className="h-10 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none"
        />
      </form>

      <ThemeToggle />
      <button
        type="button"
        className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted sm:grid"
        aria-label="Notificaciones"
      >
        <Bell className="h-4 w-4" />
      </button>

      <div className="flex shrink-0 items-center gap-3 border-border sm:border-l sm:pl-3">
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-medium">{user?.name ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{user?.role ?? ''}</div>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {initial}
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
