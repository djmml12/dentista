import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { AppointmentForm } from './AppointmentForm';
import { WeekCalendar } from './WeekCalendar';
import { MonthCalendar } from './MonthCalendar';
import { ScheduleDialog } from './ScheduleDialog';
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useDentists,
  useUpdateAppointment,
  useUpdateAppointmentStatus,
} from './queries';
import { STATUS_COLORS, STATUS_LABELS, type Appointment, type AppointmentInput, type AppointmentStatus } from '@/types/appointment';
import { ApiError } from '@/lib/api';

type View = 'month' | 'week' | 'day';

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
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const dow = (x.getDay() + 6) % 7; // 0 = lunes
  return addDays(x, -dow);
}
/** 42 días (6 semanas) que empiezan en lunes y cubren el mes de `anchor`. */
function monthGridRange(anchor: Date): { from: Date; to: Date } {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const dow = (first.getDay() + 6) % 7;
  const from = addDays(startOfDay(first), -dow);
  const to = new Date(addDays(from, 41));
  to.setHours(23, 59, 59, 999);
  return { from, to };
}
function rangeLabel(days: Date[], view: View, anchor: Date): string {
  if (view === 'month') {
    const s = anchor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (view === 'day') {
    const s = days[0]!.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  const a = days[0]!;
  const b = days[days.length - 1]!;
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  if (sameMonth) {
    return `${a.getDate()}–${b.getDate()} ${b.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
  }
  return `${a.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${b.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function CalendarPage() {
  const [anchor, setAnchor] = useState(() => new Date());
  const [view, setView] = useState<View>('month');
  const [dentistId, setDentistId] = useState('');
  const [now, setNow] = useState(() => new Date());
  // Cada acción del usuario incrementa animKey (remonta el calendario y reproduce la animación).
  const [animKey, setAnimKey] = useState(0);
  const [animClass, setAnimClass] = useState('motion-safe:animate-cal-fade');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = useMemo(() => {
    if (view === 'day') return [startOfDay(anchor)];
    const ws = startOfWeekMonday(anchor);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [anchor, view]);

  const range = useMemo(() => {
    if (view === 'month') {
      const { from, to } = monthGridRange(anchor);
      return { from: from.toISOString(), to: to.toISOString() };
    }
    const from = days[0]!;
    const to = new Date(days[days.length - 1]!);
    to.setHours(23, 59, 59, 999);
    return { from: from.toISOString(), to: to.toISOString() };
  }, [days, view, anchor]);

  const { data: dentists = [] } = useDentists();
  const {
    data: appointments = [],
    isError,
    error: loadError,
  } = useAppointments({ from: range.from, to: range.to, dentistId: dentistId || undefined });

  const create = useCreateAppointment();
  const update = useUpdateAppointment();
  const remove = useDeleteAppointment();
  const statusUpdate = useUpdateAppointmentStatus();

  const [modal, setModal] = useState<
    | { type: 'create'; defaults: { startsAt: string; endsAt: string } }
    | { type: 'schedule'; date: Date }
    | { type: 'edit'; appointment: Appointment }
    | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);

  function bump(cls: string) {
    setAnimClass(cls);
    setAnimKey((k) => k + 1);
  }
  function goPrev() {
    setAnchor((a) => (view === 'month' ? addMonths(a, -1) : addDays(a, view === 'week' ? -7 : -1)));
    bump('motion-safe:animate-cal-slide-right');
  }
  function goNext() {
    setAnchor((a) => (view === 'month' ? addMonths(a, 1) : addDays(a, view === 'week' ? 7 : 1)));
    bump('motion-safe:animate-cal-slide-left');
  }
  function goToday() {
    setAnchor(new Date());
    bump('motion-safe:animate-cal-fade');
  }
  function changeView(v: View) {
    if (v === view) return;
    setView(v);
    bump('motion-safe:animate-cal-fade');
  }
  function changeDentist(id: string) {
    setDentistId(id);
    bump('motion-safe:animate-cal-fade');
  }

  function openCreate(start: Date) {
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setFormError(null);
    setModal({ type: 'create', defaults: { startsAt: start.toISOString(), endsAt: end.toISOString() } });
  }
  function openSchedule(date: Date) {
    setFormError(null);
    setModal({ type: 'schedule', date });
  }
  function openEdit(a: Appointment) {
    setFormError(null);
    setModal({ type: 'edit', appointment: a });
  }

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    await statusUpdate.mutateAsync({ id, status });
  }

  async function handleSubmit(data: AppointmentInput) {
    setFormError(null);
    try {
      if (modal?.type === 'create' || modal?.type === 'schedule') await create.mutateAsync(data);
      else if (modal?.type === 'edit') await update.mutateAsync({ id: modal.appointment.id, body: data });
      setModal(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    }
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Anterior"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Siguiente"
              className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <h1 className="ml-1 text-lg font-semibold tracking-tight">{rangeLabel(days, view, anchor)}</h1>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dentistId}
            onChange={(e) => changeDentist(e.target.value)}
            className="h-9 rounded-xl border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
          >
            <option value="">Todos los dentistas</option>
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex items-center rounded-xl border border-border bg-card p-0.5 text-sm">
            {(['month', 'week', 'day'] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => changeView(v)}
                className={cn(
                  'h-8 rounded-lg px-3 font-medium transition-[background-color,color,transform] active:scale-95',
                  view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda + pista / error */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {isError ? (
          <span className="text-danger">
            No se pudieron cargar las citas{loadError instanceof ApiError ? `: ${loadError.message}` : '.'}
          </span>
        ) : (
          <>
            <span className="text-muted-foreground">
              {view === 'month' ? 'Haz clic en un día para agendar' : 'Haz clic en un hueco para agendar'}
            </span>
            <span className="text-border">·</span>
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[k as keyof typeof STATUS_COLORS] }} />
                {label}
              </span>
            ))}
          </>
        )}
      </div>

      {/* Calendario: llena el resto de la pantalla, sin scroll. Remonta en cada acción. */}
      <div key={animKey} className={cn('min-h-0 flex-1 overflow-hidden', animClass)}>
        {view === 'month' ? (
          <MonthCalendar
            monthAnchor={anchor}
            appointments={appointments}
            now={now}
            onSelectDay={openSchedule}
            onEdit={openEdit}
            onStatusChange={handleStatusChange}
            pendingStatusId={statusUpdate.isPending ? statusUpdate.variables?.id : undefined}
          />
        ) : (
          <WeekCalendar
            days={days}
            appointments={appointments}
            now={now}
            onCreate={openCreate}
            onEdit={openEdit}
            onStatusChange={handleStatusChange}
            pendingStatusId={statusUpdate.isPending ? statusUpdate.variables?.id : undefined}
          />
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? 'Editar cita' : 'Nueva cita'}
        description={modal?.type === 'schedule' ? 'Elige la hora y los datos del paciente' : undefined}
        size="lg"
      >
        {modal?.type === 'schedule' && (
          <ScheduleDialog
            date={modal.date}
            onCancel={() => setModal(null)}
            onSubmit={handleSubmit}
            error={formError}
            submitting={create.isPending}
          />
        )}
        {modal && modal.type !== 'schedule' && (
          <AppointmentForm
            initial={
              modal.type === 'create'
                ? { startsAt: modal.defaults.startsAt, endsAt: modal.defaults.endsAt }
                : modal.appointment
            }
            onCancel={() => setModal(null)}
            onSubmit={handleSubmit}
            error={formError}
            submitting={create.isPending || update.isPending}
            onDelete={
              modal.type === 'edit'
                ? async () => {
                    if (!confirm('¿Eliminar esta cita?')) return;
                    await remove.mutateAsync(modal.appointment.id);
                    setModal(null);
                  }
                : undefined
            }
          />
        )}
      </Modal>
    </div>
  );
}
