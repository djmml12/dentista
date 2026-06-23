import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Receipt as ReceiptIcon, Printer, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { billingApi } from './billing.api';
import type { ReceiptStatus } from './types';

const STATUS_LABEL: Record<ReceiptStatus, string> = {
  DRAFT: 'Borrador',
  ISSUED: 'Emitido',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};

const STATUS_COLOR: Record<ReceiptStatus, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  ISSUED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  PAID: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const fmt = (n: number) => n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });

type FilterStatus = ReceiptStatus | 'ALL';

export function ReceiptsListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('ALL');

  const { data: receipts = [], isLoading, isError } = useQuery({
    queryKey: ['receipts', filter],
    queryFn: () => billingApi.listReceipts(filter !== 'ALL' ? { status: filter } : {}),
  });

  const filters: { value: FilterStatus; label: string }[] = [
    { value: 'ALL', label: 'Todos' },
    { value: 'DRAFT', label: 'Borradores' },
    { value: 'ISSUED', label: 'Emitidos' },
    { value: 'PAID', label: 'Pagados' },
    { value: 'CANCELLED', label: 'Cancelados' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cobros</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Recibos emitidos en el consultorio</p>
        </div>
        <Button onClick={() => navigate('/cobros/nuevo')}>
          <Plus className="h-4 w-4" /> Nuevo recibo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              filter === value
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-muted rounded-xl" />)}
        </div>
      )}

      {isError && <p className="text-sm text-danger">No se pudo cargar la lista de recibos.</p>}

      {!isLoading && !isError && receipts.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ReceiptIcon className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No hay recibos {filter !== 'ALL' ? `con estado "${STATUS_LABEL[filter as ReceiptStatus]}"` : ''}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/cobros/nuevo')}>
            <Plus className="h-4 w-4" /> Crear el primero
          </Button>
        </div>
      )}

      {receipts.length > 0 && (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {receipts.map((r) => {
            const total = r.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
            const fecha = new Date(r.issuedAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 px-5 py-4 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/cobros/${r.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {r.patient.firstName} {r.patient.lastName}
                    </p>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', STATUS_COLOR[r.status as ReceiptStatus])}>
                      {STATUS_LABEL[r.status as ReceiptStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fecha} · {r.items.length} artículo{r.items.length !== 1 ? 's' : ''} · #{r.id.slice(-8).toUpperCase()}
                  </p>
                </div>
                <p className="font-bold text-lg tabular-nums shrink-0">{fmt(total)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); window.open(`/cobros/${r.id}/imprimir`, '_blank'); }}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                  title="Imprimir"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
