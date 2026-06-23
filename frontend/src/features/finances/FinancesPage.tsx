import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Clock, CalendarDays, Banknote, FileDown } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useFinancialSummary } from './queries';
import { KpiCard } from './KpiCard';
import { IncomeBarChart } from './IncomeBarChart';
import { ServiceTypeDonut } from './ServiceTypeDonut';
import { ProjectionAreaChart } from './ProjectionAreaChart';
import { RecentReceiptsTable } from './RecentReceiptsTable';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function MonthSelector({ year, month, onChange }: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }

  function next() {
    if (isCurrentMonth) return;
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 shadow-sm">
      <button
        onClick={prev}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[130px] text-center text-sm font-medium">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-90 disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export function FinancesPage() {
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;

  const { data, isLoading, isError } = useFinancialSummary(year, month);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Finanzas</h1>
          <p className="text-sm text-muted-foreground">Vista financiera del consultorio</p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          <button
            onClick={() => window.open(`/finanzas/imprimir?year=${year}&month=${month}`, '_blank')}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          Error al cargar los datos financieros. Intenta de nuevo.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : data ? (
          <>
            <KpiCard
              label="Cobrado este mes"
              value={data.currentMonth.collected}
              icon={<Banknote className="h-5 w-5" />}
              description="Recibos pagados"
              colorClass="text-primary"
              delay={0}
            />
            <KpiCard
              label="Pendiente"
              value={data.currentMonth.pending}
              icon={<Clock className="h-5 w-5" />}
              description="Recibos emitidos sin cobrar"
              colorClass="text-amber-600"
              delay={80}
            />
            <KpiCard
              label="Proyectado"
              value={data.projection.estimatedTotal}
              icon={<TrendingUp className="h-5 w-5" />}
              description="~estimado próximos 30 días"
              colorClass="text-violet-600"
              delay={160}
            />
            <KpiCard
              label="Citas futuras"
              value={data.projection.upcomingCount}
              icon={<CalendarDays className="h-5 w-5" />}
              description="Próximos 30 días"
              isCurrency={false}
              colorClass="text-sky-600"
              delay={240}
            />
          </>
        ) : null}
      </div>

      {/* Bar chart — full width */}
      {isLoading ? (
        <Skeleton className="h-[300px]" />
      ) : data ? (
        <IncomeBarChart data={data.lastSixMonths} />
      ) : null}

      {/* Donut + Area side by side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {isLoading ? (
          <>
            <Skeleton className="h-[300px]" />
            <Skeleton className="h-[300px]" />
          </>
        ) : data ? (
          <>
            <ServiceTypeDonut data={data.byServiceType} />
            <ProjectionAreaChart projection={data.projection} />
          </>
        ) : null}
      </div>

      {/* Recent receipts */}
      {isLoading ? (
        <Skeleton className="h-[280px]" />
      ) : data ? (
        <RecentReceiptsTable receipts={data.recentReceipts} />
      ) : null}
    </div>
  );
}
