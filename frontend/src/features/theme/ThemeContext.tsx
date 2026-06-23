import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

interface ThemeContextValue {
  /** Preferencia elegida por el usuario (incluye "system"). */
  theme: ThemePreference;
  /** Tema realmente aplicado tras resolver "system". */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  /** Alterna entre claro y oscuro (ancla la preferencia, sale de "system"). */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readStored(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system'
    ? stored
    : 'system';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') return prefersDark() ? 'dark' : 'light';
  return pref;
}

/** Aplica/quita la clase .dark en <html>. La transición suave solo se activa
 *  cuando el usuario cambia el tema, nunca en la carga inicial (evita el flash). */
function applyResolved(resolved: ResolvedTheme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-transition');
    window.setTimeout(() => root.classList.remove('theme-transition'), 220);
  }
  root.classList.toggle('dark', resolved === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStored);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolve(readStored()),
  );

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    const resolved = resolve(next);
    setResolvedTheme(resolved);
    applyResolved(resolved, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  // Sincroniza con el SO mientras la preferencia sea "system".
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const resolved = prefersDark() ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyResolved(resolved, true);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}
