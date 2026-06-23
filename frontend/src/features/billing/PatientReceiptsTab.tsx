import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Printer, ChevronRight, ReceiptText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { billingApi } from './billing.api';
import { usePatient } from '@/features/patients/queries';
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

export function PatientReceiptsTab() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient } = usePatient(patientId!);

  const { data: receipts = [], isLoading, isError } = useQuery({
    queryKey: ['receipts', 'patient', patientId],
    queryFn: () => billingApi.listReceipts({ patientId }),
    enabled: !!patientId,
  });

  function newReceipt() {
    const params = new URLSearchParams({
      pacienteId: patientId!,
      nombre: patient ? `${patient.firstName} ${patient.lastName}` : '',
      email: patient?.email ?? '',
    });
    navigate(`/cobros/nuevo?${params.toString()}`);
  }

  if (isLoading) return <div className="space-y-3 animate-pulse p-4">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted rounded-xl" />)}</div>;
  if (isError) return <p className="text-sm text-danger p-4">No se pudieron cargar los cobros.</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{receipts.length} recibo{receipts.length !== 1 ? 's' : ''} registrado{receipts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={newReceipt}>
          <Plus className="h-3.5 w-3.5" /> Nuevo recibo
        </Button>
      </div>

      {receipts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <ReceiptText className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No hay cobros registrados para este paciente.</p>
          <Button variant="secondary" className="mt-3" size="sm" onClick={newReceipt}>
            <Plus className="h-3.5 w-3.5" /> Crear recibo
          </Button>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {receipts.map((r) => {
            const total = r.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
            const fecha = new Date(r.issuedAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 px-4 py-3.5 bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/cobros/${r.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium shrink-0', STATUS_COLOR[r.status as ReceiptStatus])}>
                      {STATUS_LABEL[r.status as ReceiptStatus]}
                    </span>
                    <p className="text-xs text-muted-foreground">{fecha} · {r.items.length} artículo{r.items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="font-bold tabular-nums shrink-0">{fmt(total)}</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); window.open(`/cobros/${r.id}/imprimir`, '_blank'); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
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
