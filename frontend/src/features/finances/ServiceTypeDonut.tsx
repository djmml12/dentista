import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { ServiceTypeData } from './finances.api';

const COLORS: Record<string, string> = {
  SERVICE: '#0d9488',
  PRODUCT: '#fbbf24',
  SUPPLY: '#fb7185',
  OTHER: '#94a3b8',
};

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: ServiceTypeData }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground">{item.name}</p>
      <p className="text-muted-foreground">{fmt(item.value)}</p>
    </div>
  );
}

interface Props {
  data: ServiceTypeData[];
}

export function ServiceTypeDonut({ data }: Props) {
  const hasData = data.length > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">Por tipo de servicio</h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={85}
              dataKey="total"
              nameKey="label"
              paddingAngle={3}
              startAngle={90}
              endAngle={-270}
              animationDuration={550}
              animationEasing="ease-out"
            >
              {data.map((entry) => (
                <Cell key={entry.type} fill={COLORS[entry.type] ?? '#94a3b8'} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => <span style={{ color: 'var(--muted-foreground)' }}>{v}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
          Sin cobros en este período
        </div>
      )}
    </div>
  );
}
