import { useMemo, type MouseEvent } from 'react';
import { STATUS_COLORS, type Appointment, type AppointmentStatus } from '@/types/appointment';
import { useClinicConfig } from '@/features/settings/useClinicConfig';
import { StatusQuickPicker } from './StatusQuickPicker';

interface Props {
  days: Date[];
  appointments: Appointment[];
  now: Date;
  /** Abre el formulario de creación en la hora donde se hizo clic. */
  onCreate: (start: Date) => void;
  onEdit: (a: Appointment) => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  pendingStatusId?: string;
}

const DEFAULT_START = 8;
const DEFAULT_END = 20;
const SNAP_MIN = 30; // los clics se ajustan a bloques de 30 min

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface Positioned {
  a: Appointment;
  startMin: number;
  endMin: number;
  lane: number;
  lanes: number;
}

/** Calcula posición vertical (minutos) y carriles para solapes dentro de un día. */
function layoutDay(events: Appointment[], day: Date, startHour: number, endHour: number): Positioned[] {
  const rangeStart = new Date(day);
  rangeStart.setHours(startHour, 0, 0, 0);
  const totalMin = (endHour - startHour) * 60;

  const items = events
    .map((a) => {
      let startMin = (new Date(a.startsAt).getTime() - rangeStart.getTime()) / 60000;
      let endMin = (new Date(a.endsAt).getTime() - rangeStart.getTime()) / 60000;
      startMin = clamp(startMin, 0, totalMin);
      endMin = clamp(endMin, 0, totalMin);
      if (endMin - startMin < 18) endMin = Math.min(startMin + 18, totalMin); // alto mínimo visible
      return { a, startMin, endMin };
    })
    .sort((x, y) => x.startMin - y.startMin || x.endMin - y.endMin);

  const result: Positioned[] = [];
  let cluster: { a: Appointment; startMin: number; endMin: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const laneEnds: number[] = [];
    const placed = cluster.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endMin);
      } else {
        laneEnds[lane] = it.endMin;
      }
      return { ...it, lane };
    });
    for (const p of placed) result.push({ ...p, lanes: laneEnds.length });
    cluster = [];
  };

  for (const it of items) {
    if (cluster.length > 0 && it.startMin >= clusterEnd) flush();
    clusterEnd = cluster.length === 0 ? it.endMin : Math.max(clusterEnd, it.endMin);
    cluster.push(it);
  }
  if (cluster.length > 0) flush();
  return result;
}

export function WeekCalendar({ days, appointments, now, onCreate, onEdit, onStatusChange, pendingStatusId }: Props) {
  const { data: clinicCfg } = useClinicConfig();
  const configStart = clinicCfg?.workStart ?? DEFAULT_START;
  const configEnd = clinicCfg?.workEnd ?? DEFAULT_END;

  // Rango horario adaptativo: usa el horario de la clínica, se expande si hay citas fuera (nunca las oculta).
  const { startHour, endHour } = useMemo(() => {
    let lo = configStart;
    let hi = configEnd;
    for (const a of appointments) {
      const s = new Date(a.startsAt);
      const e = new Date(a.endsAt);
      if (days.some((d) => isSameDay(d, s))) {
        lo = Math.min(lo, s.getHours());
        hi = Math.max(hi, e.getMinutes() > 0 ? e.getHours() + 1 : e.getHours());
      }
    }
    return { startHour: clamp(lo, 0, 22), endHour: clamp(hi, 2, 24) };
  }, [appointments, days, configStart, configEnd]);

  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour],
  );
  const totalMin = (endHour - startHour) * 60;
  const gutter = '3.25rem';

  function handleColumnClick(day: Date, e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const minutesFromStart = pct * totalMin;
    const snapped = Math.floor(minutesFromStart / SNAP_MIN) * SNAP_MIN;
    const start = new Date(day);
    start.setHours(startHour, 0, 0, 0);
    start.setMinutes(start.getMinutes() + snapped);
    onCreate(start);
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card overflow-hidden">
      {/* Cabecera de días */}
      <div className="grid border-b border-border" style={{ gridTemplateColumns: `${gutter} repeat(${days.length}, minmax(0,1fr))` }}>
        <div className="border-r border-border" />
        {days.map((d) => {
          const today = isSameDay(d, now);
          return (
            <div
              key={d.toISOString()}
              className="flex flex-col items-center justify-center py-2 border-r border-border last:border-r-0"
            >
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {d.toLocaleDateString('es-ES', { weekday: 'short' })}
              </span>
              <span
                className={
                  'mt-0.5 grid h-7 w-7 place-items-center rounded-full text-sm font-semibold transition-colors ' +
                  (today ? 'bg-primary text-primary-foreground' : 'text-foreground')
                }
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Cuerpo: columnas flex que llenan la altura; cada día usa filas fr (sin scroll) */}
      <div className="flex flex-1 min-h-0">
        {/* Columna de horas */}
        <div className="grid shrink-0 border-r border-border" style={{ width: gutter, gridTemplateRows: `repeat(${hours.length}, minmax(0,1fr))` }}>
          {hours.map((h) => (
            <div key={h} className="relative">
              <span className="absolute -top-2 right-1.5 text-[10px] tabular-nums text-muted-foreground">
                {h}:00
              </span>
            </div>
          ))}
        </div>

        {/* Columnas de días */}
        {days.map((day) => {
          const dayEvents = appointments.filter((a) => isSameDay(new Date(a.startsAt), day));
          const positioned = layoutDay(dayEvents, day, startHour, endHour);
          const today = isSameDay(day, now);
          const nowPct = today
            ? clamp(((now.getHours() - startHour) * 60 + now.getMinutes()) / totalMin, 0, 1) * 100
            : null;

          return (
            <div
              key={day.toISOString()}
              onClick={(e) => handleColumnClick(day, e)}
              className={
                'relative flex-1 border-r border-border last:border-r-0 cursor-pointer ' +
                (today ? 'bg-primary/[0.03]' : '')
              }
            >
              {/* Líneas de hora (fondo, también captura el clic para crear) */}
              <div className="absolute inset-0 grid" style={{ gridTemplateRows: `repeat(${hours.length}, minmax(0,1fr))` }}>
                {hours.map((h) => (
                  <div key={h} className="border-t border-border/50 transition-colors hover:bg-primary/[0.04]" />
                ))}
              </div>

              {/* Línea de "ahora" */}
              {nowPct != null && (
                <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: `${nowPct}%` }}>
                  <div className="relative h-px bg-danger">
                    <span className="absolute -left-1 -top-[3px] h-1.5 w-1.5 rounded-full bg-danger motion-safe:animate-now-pulse" />
                  </div>
                </div>
              )}

              {/* Citas */}
              {positioned.map((p, i) => {
                const color = STATUS_COLORS[p.a.status];
                const top = (p.startMin / totalMin) * 100;
                const height = ((p.endMin - p.startMin) / totalMin) * 100;
                const width = 100 / p.lanes;
                const left = p.lane * width;
                return (
                  <button
                    key={p.a.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(p.a);
                    }}
                    style={{
                      top: `${top}%`,
                      height: `${height}%`,
                      left: `calc(${left}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                      borderLeftColor: color,
                      background: `${color}1f`,
                      animationDelay: `${Math.min(i * 18, 140)}ms`,
                    }}
                    className="group absolute z-10 flex flex-col overflow-hidden rounded-md border border-border border-l-[3px] px-1.5 py-1 text-left
                      transition-[transform,box-shadow] hover:z-30 hover:-translate-y-0.5 hover:shadow-card active:scale-[0.98]
                      motion-safe:animate-event-pop"
                  >
                    <div className="flex items-center gap-1">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-tight text-foreground">
                        {p.a.patient.lastName}, {p.a.patient.firstName}
                      </span>
                      <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                        <StatusQuickPicker
                          status={p.a.status}
                          onChange={(s) => onStatusChange(p.a.id, s)}
                          pending={pendingStatusId === p.a.id}
                        />
                      </span>
                    </div>
                    <span className="truncate text-[10px] leading-tight text-muted-foreground">
                      {fmtTime(new Date(p.a.startsAt))}
                      {p.a.reason ? ` · ${p.a.reason}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
