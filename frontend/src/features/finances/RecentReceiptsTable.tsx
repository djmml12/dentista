import { Link } from 'react-router-dom';
import type { RecentReceipt } from './finances.api';

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado',
  ISSUED: 'Emitido',
  CANCELLED: 'Cancelado',
};

const STATUS_CLASS: Record<string, string> = {
  PAID: 'bg-teal-100 text-teal-700',
  ISSUED: 'bg-amber-100 text-amber-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 });

interface Props {
  receipts: RecentReceipt[];
}

export function RecentReceiptsTable({ receipts }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Recibos recientes</h3>
      </div>
      {receipts.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sin recibos registrados</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Paciente</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Fecha</th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Total</th>
                <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/pacientes/${r.patientId}/cobros`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {r.patientName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(r.issuedAt).toLocaleDateString('es-GT', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {fmt(r.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
