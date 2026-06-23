import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { MonthData } from './finances.api';

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

interface Props {
  data: MonthData[];
}

export function IncomeBarChart({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">Ingresos últimos 6 meses</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
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
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5, radius: 4 }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(v) => <span style={{ color: 'var(--muted-foreground)' }}>{v}</span>}
          />
          <Bar
            dataKey="collected"
            name="Cobrado"
            fill="#0d9488"
            radius={[4, 4, 0, 0]}
            animationDuration={400}
            animationEasing="ease-out"
            animationBegin={0}
          />
          <Bar
            dataKey="pending"
            name="Pendiente"
            fill="#99f6e4"
            radius={[4, 4, 0, 0]}
            animationDuration={400}
            animationEasing="ease-out"
            animationBegin={80}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
