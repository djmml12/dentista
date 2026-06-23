import { useMemo, type MouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { STATUS_COLORS, type Appointment, type AppointmentStatus } from '@/types/appointment';
import { StatusQuickPicker } from './StatusQuickPicker';

interface Props {
  /** Cualquier fecha dentro del mes a mostrar. */
  monthAnchor: Date;
  appointments: Appointment[];
  now: Date;
  /** Clic en un día vacío: abre la interfaz para elegir hora + paciente. */
  onSelectDay: (day: Date) => void;
  onEdit: (a: Appointment) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  pendingStatusId?: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** 42 días (6 semanas) que empiezan en lunes y cubren el mes de `anchor`. */
function buildGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7; // 0 = lunes
  const gridStart = addDays(startOfDay(first), -dow);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function MonthCalendar({ monthAnchor, appointments, now, onSelectDay, onEdit, onStatusChange, pendingStatusId }: Props) {
  const grid = useMemo(() => buildGrid(monthAnchor), [monthAnchor]);
  const month = monthAnchor.getMonth();

  // Agrupa citas por día (clave YYYY-MM-DD) y ordena por hora de inicio.
  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const d = new Date(a.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key);
      if (arr) arr.push(a);
      else map.set(key, [a]);
    }
    for (const arr of map.values()) {
      arr.sort((x, y) => new Date(x.startsAt).getTime() - new Date(y.startsAt).getTime());
    }
    return map;
  }, [appointments]);

  function dayKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function handleDayClick(day: Date, e: MouseEvent<HTMLDivElement>) {
    // Solo dispara si el clic fue en el fondo de la celda, no en una cita.
    if ((e.target as HTMLElement).closest('[data-event]')) return;
    onSelectDay(day);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Cabecera de días de la semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          >
            <span className="sm:hidden">{w.charAt(0)}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>

      {/* Rejilla de 6 semanas que llena la altura disponible */}
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {grid.map((day, i) => {
          const inMonth = day.getMonth() === month;
          const today = isSameDay(day, now);
          const events = byDay.get(dayKey(day)) ?? [];
          const col = i % 7;
          const row = Math.floor(i / 7);

          return (
            <div
              key={day.toISOString()}
              onClick={(e) => handleDayClick(day, e)}
              className={
                'group relative flex min-h-0 cursor-pointer flex-col gap-1 p-1 transition-colors sm:p-1.5 ' +
                (col < 6 ? 'border-r ' : '') +
                (row < 5 ? 'border-b ' : '') +
                'border-border/60 hover:bg-primary/[0.04] ' +
                (inMonth ? '' : 'bg-muted/30 ')
              }
            >
              {/* Número del día + botón rápido de añadir */}
              <div className="flex items-center justify-between">
                <span
                  className={
                    'grid h-6 w-6 place-items-center rounded-full text-xs font-semibold transition-colors ' +
                    (today
                      ? 'bg-primary text-primary-foreground'
                      : inMonth
                        ? 'text-foreground'
                        : 'text-muted-foreground/60')
                  }
                >
                  {day.getDate()}
                </span>
                <span
                  className="grid h-5 w-5 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                >
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Citas como chips (≥ sm) */}
              <div className="hidden min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                {events.slice(0, 4).map((a) => {
                  const color = STATUS_COLORS[a.status];
                  return (
                    <div
                      key={a.id}
                      data-event
                      style={{ borderLeftColor: color, background: `${color}1f` }}
                      className="group flex items-center gap-1 rounded-md border-l-[3px] px-1.5 py-0.5 text-[11px] leading-tight"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(a);
                        }}
                        className="flex min-w-0 flex-1 items-center gap-1 text-left transition-transform hover:translate-x-0.5 active:scale-[0.98]"
                      >
                        <span className="tabular-nums text-muted-foreground">{fmtTime(new Date(a.startsAt))}</span>
                        <span className="truncate font-medium text-foreground">
                          {a.patient.lastName}, {a.patient.firstName}
                        </span>
                      </button>
                      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <StatusQuickPicker
                          status={a.status}
                          onChange={(s) => onStatusChange(a.id, s)}
                          pending={pendingStatusId === a.id}
                        />
                      </span>
                    </div>
                  );
                })}
                {events.length > 4 && (
                  <span className="px-1 text-[10px] font-medium text-muted-foreground">
                    +{events.length - 4} más
                  </span>
                )}
              </div>

              {/* Citas como puntos de color (móvil) */}
              {events.length > 0 && (
                <div className="flex flex-wrap items-center gap-0.5 sm:hidden">
                  {events.slice(0, 4).map((a) => (
                    <span
                      key={a.id}
                      data-event
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(a);
                      }}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: STATUS_COLORS[a.status] }}
                    />
                  ))}
                  {events.length > 4 && (
                    <span className="text-[9px] font-medium leading-none text-muted-foreground">
                      +{events.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
