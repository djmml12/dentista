import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';
import { useClinicConfig, useSaveClinicConfig } from './useClinicConfig';

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0..24

function fmt(h: number) {
  return `${String(h).padStart(2, '0')}:00`;
}

function HourSelect({
  label,
  hint,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="space-y-1.5 block">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative">
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-10 rounded-xl border border-border bg-background pl-9 pr-3 text-sm focus:border-primary/50 focus:outline-none appearance-none"
        >
          {HOURS.filter((h) => h >= min && h <= max).map((h) => (
            <option key={h} value={h}>{fmt(h)}</option>
          ))}
        </select>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </label>
  );
}

export function ClinicConfigSection() {
  const { data: cfg, isLoading } = useClinicConfig();
  const save = useSaveClinicConfig();
  const [workStart, setWorkStart] = useState(8);
  const [workEnd, setWorkEnd] = useState(20);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (cfg) {
      setWorkStart(cfg.workStart);
      setWorkEnd(cfg.workEnd);
    }
  }, [cfg]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (workEnd <= workStart + 1) {
      setSaveError('La hora de fin debe ser al menos 2 horas después de la de inicio');
      return;
    }
    try {
      await save.mutateAsync({ workStart, workEnd });
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'No se pudo guardar');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  const duration = workEnd - workStart;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Horario de la clínica</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Define el rango de horas visibles en el calendario de citas y los bloques disponibles al agendar.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm">
          <HourSelect
            label="Hora de apertura"
            hint="Primera hora visible en el calendario"
            value={workStart}
            onChange={(v) => { setWorkStart(v); setSaveOk(false); }}
            min={0}
            max={22}
          />
          <HourSelect
            label="Hora de cierre"
            hint="Última hora visible en el calendario"
            value={workEnd}
            onChange={(v) => { setWorkEnd(v); setSaveOk(false); }}
            min={1}
            max={24}
          />
        </div>

        {/* Previsualización */}
        <div className="rounded-xl border border-border bg-muted/30 p-4 max-w-sm space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumen</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{
                  marginLeft: `${(workStart / 24) * 100}%`,
                  width: `${(duration / 24) * 100}%`,
                }}
              />
            </div>
          </div>
          <p className="text-sm font-medium">
            {fmt(workStart)} — {fmt(workEnd)}
            <span className="text-muted-foreground font-normal ml-2">({duration} {duration === 1 ? 'hora' : 'horas'})</span>
          </p>
        </div>

        {saveError && (
          <p className="text-sm text-danger flex items-center gap-2" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" /> {saveError}
          </p>
        )}

        <div className="flex items-center gap-3">
          {saveOk && (
            <span className="text-sm text-teal-600 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" /> Guardado
            </span>
          )}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar horario'}
          </Button>
        </div>
      </form>
    </div>
  );
}
