import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, UserPlus, Activity, ChevronDown } from 'lucide-react';
import { useAppointments, useUpdateAppointment } from '@/features/appointments/queries';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/appointment';
import type { AppointmentStatus } from '@/types/appointment';
import { useAuth } from '@/features/auth/AuthContext';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

const ALL_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
];

function StatusBadge({ appointmentId, status }: { appointmentId: string; status: AppointmentStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const update = useUpdateAppointment();

  function handleSelect(next: AppointmentStatus) {
    setOpen(false);
    if (next !== status) {
      update.mutate({ id: appointmentId, body: { status: next } });
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border border-border hover:bg-muted transition-colors"
        style={{ color: STATUS_COLORS[status] }}
        disabled={update.isPending}
      >
        {STATUS_LABELS[status]}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-border bg-card shadow-lg py-1 text-xs">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-1.5 hover:bg-muted transition-colors flex items-center gap-2 ${s === status ? 'font-semibold' : ''}`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[s] }} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const today = new Date();
  const todaysQuery = useAppointments({
    from: startOfDay(today).toISOString(),
    to: endOfDay(today).toISOString(),
  });
  const { data: todays = [] } = todaysQuery;
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const weekQuery = useAppointments({
    from: today.toISOString(),
    to: next7.toISOString(),
  });
  const { data: week = [] } = weekQuery;
  const hasError = todaysQuery.isError || weekQuery.isError;
  const upcoming = week.filter((a) => new Date(a.startsAt) > today).slice(0, 6);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {user?.name?.split(' ')[0] ?? ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {hasError && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          No se pudieron cargar las citas. Los datos pueden estar incompletos.
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        <Stat icon={<CalendarDays className="h-5 w-5" />} label="Citas hoy" value={todays.length} />
        <Stat icon={<Activity className="h-5 w-5" />} label="Citas esta semana" value={week.length} />
        <Stat
          icon={<UserPlus className="h-5 w-5" />}
          label="Confirmadas hoy"
          value={todays.filter((a) => a.status === 'CONFIRMED').length}
        />
      </div>

      <section className="grid lg:grid-cols-2 gap-6">
        <Card title="Agenda de hoy" linkLabel="Ver calendario" linkTo="/calendario">
          {todays.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas programadas para hoy.</p>
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {todays.map((a) => (
                <li key={a.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: STATUS_COLORS[a.status] }} />
                  <span className="tabular-nums text-muted-foreground w-14 shrink-0">
                    {new Date(a.startsAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Link to={`/pacientes/${a.patient.id}`} className="font-medium hover:underline flex-1 min-w-0 truncate">
                    {a.patient.firstName} {a.patient.lastName}
                  </Link>
                  <StatusBadge appointmentId={a.id} status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Próximos pacientes" linkLabel="Ver pacientes" linkTo="/pacientes">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin citas próximas.</p>
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {upcoming.map((a) => (
                <li key={a.id} className="px-6 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1">
                    <Link to={`/pacientes/${a.patient.id}`} className="font-medium hover:underline">
                      {a.patient.firstName} {a.patient.lastName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{a.reason ?? 'Sin motivo'}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(a.startsAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
      <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary grid place-items-center">{icon}</div>
      <div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function Card({
  title,
  linkLabel,
  linkTo,
  children,
}: {
  title: string;
  linkLabel?: string;
  linkTo?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="flex items-center justify-between mb-3">
        <h3 className="font-medium">{title}</h3>
        {linkLabel && linkTo && (
          <Link to={linkTo} className="text-xs text-primary hover:underline">{linkLabel}</Link>
        )}
      </header>
      {children}
    </section>
  );
}
