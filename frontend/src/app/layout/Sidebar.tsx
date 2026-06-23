import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, Settings, X, ReceiptText, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const BASE_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard },
  { to: '/pacientes', label: 'Pacientes', icon: Users },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/cobros', label: 'Cobros', icon: ReceiptText },
];

const ADMIN_ITEMS: NavItem[] = [
  { to: '/finanzas', label: 'Finanzas', icon: TrendingUp },
];

const BOTTOM_ITEMS: NavItem[] = [
  { to: '/configuracion', label: 'Configuración', icon: Settings },
];

interface Props {
  mobileOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ mobileOpen, onClose }: Props) {
  const { user } = useAuth();
  const items = [
    ...BASE_ITEMS,
    ...(user?.role === 'ADMIN' ? ADMIN_ITEMS : []),
    ...BOTTOM_ITEMS,
  ];

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'flex w-64 shrink-0 flex-col border-r border-border bg-card',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0 shadow-card' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10">
              <span className="font-semibold text-primary">D</span>
            </div>
            <span className="font-semibold tracking-tight">Dental</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
