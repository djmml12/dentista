import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Projection } from './finances.api';

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  if (!p) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-muted-foreground">
        Estimado: <span className="font-medium text-foreground">{fmt(p.value)}</span>
      </p>
    </div>
  );
}

interface Props {
  projection: Projection;
}

export function ProjectionAreaChart({ projection }: Props) {
  const { byWeek, hasData, avgTicket } = projection;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-foreground">Proyección próximas 4 semanas</h3>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          ~estimado
        </span>
      </div>
      {hasData ? (
        <p className="mb-4 text-xs text-muted-foreground">
          Basado en ticket promedio del mes: <span className="font-medium text-foreground">{fmt(avgTicket)}</span>
        </p>
      ) : (
        <p className="mb-4 text-xs text-amber-600">
          Sin cobros pagados este mes — la proyección no está disponible aún.
        </p>
      )}
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={byWeek}>
          <defs>
            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0d9488" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => `Q${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            width={45}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#0d9488', strokeWidth: 1, strokeDasharray: '4 2' }} />
          <Area
            type="monotone"
            dataKey="estimated"
            name="Estimado"
            stroke="#0d9488"
            strokeWidth={2}
            fill="url(#projGrad)"
            dot={{ fill: '#0d9488', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#0d9488', strokeWidth: 0 }}
            animationDuration={600}
            animationEasing="ease-in-out"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {byWeek.map((w) => (
          <div key={w.label} className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-xs font-semibold text-primary">{w.appointments}</p>
            <p className="text-[10px] text-muted-foreground">citas</p>
          </div>
        ))}
      </div>
    </div>
  );
}
