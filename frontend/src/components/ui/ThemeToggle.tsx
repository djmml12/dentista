import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/features/theme/ThemeContext';

/** Botón rápido de la barra superior: alterna claro/oscuro de un toque. */
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="h-10 w-10 grid place-items-center rounded-xl text-muted-foreground hover:bg-muted transition-colors"
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo noche'}
      title={isDark ? 'Modo claro' : 'Modo noche'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
