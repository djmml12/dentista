import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from './billing.api';

const fmt = (n: number) => n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });

export function ReceiptPrint() {
  const { id } = useParams<{ id: string }>();

  const { data: receipt, isLoading, isError } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => billingApi.getReceipt(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (receipt) {
      document.title = `Recibo #${receipt.id.slice(-8).toUpperCase()}`;
      // Auto-print cuando el recibo está listo
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [receipt]);

  if (isLoading) return <div className="p-8 text-center">Cargando recibo…</div>;
  if (isError || !receipt) return <div className="p-8 text-center text-red-600">No se pudo cargar el recibo.</div>;

  const total = receipt.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const fecha = new Date(receipt.issuedAt).toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <style>{`
        @media print {
          html, body { margin: 0; height: auto; }
          .no-print { display: none !important; }
          @page { margin: 20mm; size: A4; }
        }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; }
      `}</style>

      {/* Botón solo visible en pantalla */}
      <div className="no-print fixed top-4 right-4 flex gap-2">
        <button
          onClick={() => window.print()}
          style={{ background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
        >
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
        >
          Cerrar
        </button>
      </div>

      <div style={{ maxWidth: '680px', margin: '40px auto 0', padding: '0 24px' }}>
        {/* Encabezado */}
        <div style={{ borderBottom: '2px solid #0d9488', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#0d9488' }}>RECIBO DE PAGO</h1>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>#{receipt.id.slice(-8).toUpperCase()}</p>
            </div>
            <div style={{ textAlign: 'right', fontSize: '13px', color: '#6b7280' }}>
              <p style={{ margin: 0, fontWeight: 600, color: '#111' }}>{fecha}</p>
              <p style={{ margin: '2px 0 0' }}>Atendido por: {receipt.createdBy.name}</p>
            </div>
          </div>
        </div>

        {/* Datos del paciente */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', margin: '0 0 4px' }}>Paciente</p>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{receipt.patient.firstName} {receipt.patient.lastName}</p>
          {receipt.patient.email && <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>{receipt.patient.email}</p>}
        </div>

        {/* Tabla de artículos */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Descripción</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: '60px' }}>Cant.</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: '110px' }}>P. unitario</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb', width: '110px' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((it, idx) => (
              <tr key={it.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid #f0f0f0' }}>{it.description}</td>
                <td style={{ padding: '10px 12px', fontSize: '14px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>{it.quantity}</td>
                <td style={{ padding: '10px 12px', fontSize: '14px', textAlign: 'right', borderBottom: '1px solid #f0f0f0' }}>{fmt(it.unitPrice)}</td>
                <td style={{ padding: '10px 12px', fontSize: '14px', textAlign: 'right', fontWeight: 500, borderBottom: '1px solid #f0f0f0' }}>{fmt(it.quantity * it.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 20px', textAlign: 'right' }}>
            <p style={{ margin: '0 0 2px', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
            <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#0d9488' }}>{fmt(total)}</p>
          </div>
        </div>

        {/* Notas */}
        {receipt.notes && (
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '8px' }}>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px', fontWeight: 600 }}>Notas</p>
            <p style={{ fontSize: '13px', margin: 0 }}>{receipt.notes}</p>
          </div>
        )}

        {/* Pie */}
        <div style={{ marginTop: '48px', textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
          <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>Gracias por su preferencia</p>
        </div>
      </div>
    </>
  );
}
