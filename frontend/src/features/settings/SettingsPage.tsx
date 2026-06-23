import { useState, type FormEvent } from 'react';
import { User, Palette, Mail, MessageCircle, Pencil, Clock, Users, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme, type ThemePreference } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { EmailConfigSection } from './EmailConfigSection';
import { WhatsappConfigSection } from './WhatsappConfigSection';
import { ClinicConfigSection } from './ClinicConfigSection';
import { UsersSection } from './UsersSection';
import { BillableItemsSection } from '@/features/billing/BillableItemsSection';
import { Sun, Moon, Monitor } from 'lucide-react';

type Section = 'perfil' | 'apariencia' | 'clinica' | 'usuarios' | 'catalogo' | 'correo' | 'whatsapp';

const NAV_ITEMS: { id: Section; label: string; icon: typeof User; adminOnly?: boolean }[] = [
  { id: 'perfil',     label: 'Perfil',           icon: User           },
  { id: 'apariencia', label: 'Apariencia',        icon: Palette        },
  { id: 'clinica',    label: 'Clínica',           icon: Clock,         adminOnly: true },
  { id: 'usuarios',   label: 'Usuarios',          icon: Users,         adminOnly: true },
  { id: 'catalogo',   label: 'Catálogo cobros',   icon: ReceiptText,   adminOnly: true },
  { id: 'correo',     label: 'Correo',            icon: Mail,          adminOnly: true },
  { id: 'whatsapp',   label: 'WhatsApp',          icon: MessageCircle, adminOnly: true },
];

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light',  label: 'Claro',   icon: Sun     },
  { value: 'dark',   label: 'Noche',   icon: Moon    },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN:     'Administrador',
  DENTIST:   'Dentista',
  ASSISTANT: 'Recepcionista',
};

function ProfilePanel() {
  const { user, updateProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function openEdit() {
    setName(user?.name ?? '');
    setLicenseNumber(user?.licenseNumber ?? '');
    setSpecialty(user?.specialty ?? '');
    setError(null);
    setOpen(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        licenseNumber: licenseNumber.trim() || null,
        specialty: specialty.trim() || null,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tu perfil</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Información que aparece en tus recetas y registros.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={openEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Nombre</p>
            <p className="font-medium">{user?.name || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Usuario</p>
            <p className="font-medium">{user?.username || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rol</p>
            <p className="font-medium">{user ? (ROLE_LABELS[user.role] ?? user.role) : '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Cédula profesional</p>
            <p className="font-medium">{user?.licenseNumber || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Especialidad</p>
            <p className="font-medium">{user?.specialty || '—'}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          La cédula profesional y la especialidad aparecen en el encabezado de las recetas impresas.
        </p>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar perfil">
        <form onSubmit={submit} className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Nombre *</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Cédula profesional</span>
              <Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} maxLength={60} />
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Especialidad</span>
              <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} maxLength={120} placeholder="Ej. Cirujano Dentista" />
            </label>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving || !name.trim()}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Apariencia</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Elige el tema de la interfaz. «Sistema» sigue la preferencia de tu dispositivo.
        </p>
      </div>
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3 max-w-sm">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-xl border px-3 py-5 text-sm transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [section, setSection] = useState<Section>('perfil');

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex gap-8 h-full">
      {/* Sidebar nav */}
      <aside className="w-52 shrink-0">
        <div className="sticky top-0 space-y-1">
          <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Configuración
          </p>
          {visibleItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                section === id
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </aside>

      {/* Content panel */}
      <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card p-8">
        {section === 'perfil'     && <ProfilePanel />}
        {section === 'apariencia' && <AppearancePanel />}
        {section === 'clinica'    && <ClinicConfigSection />}
        {section === 'usuarios'   && <UsersSection />}
        {section === 'catalogo'   && <BillableItemsSection />}
        {section === 'correo'     && <EmailConfigSection />}
        {section === 'whatsapp'   && <WhatsappConfigSection />}
      </div>
    </div>
  );
}
