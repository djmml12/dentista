import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { useFinancialSummary } from './queries';
import { CLINIC } from '@/features/prescriptions/clinic';
import type { MonthData, WeekProjection } from './finances.api';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 });

const STATUS_LABEL: Record<string, string> = { PAID: 'Pagado', ISSUED: 'Emitido', CANCELLED: 'Cancelado' };
const STATUS_COLOR: Record<string, string> = { PAID: '#0d9488', ISSUED: '#d97706', CANCELLED: '#dc2626' };

const TYPE_COLORS: Record<string, string> = {
  SERVICE: '#0d9488',
  PRODUCT: '#fbbf24',
  SUPPLY: '#fb7185',
  OTHER: '#94a3b8',
};

// ── Gráfica de barras SVG ────────────────────────────────────────────────────
function BarChartSvg({ data }: { data: MonthData[] }) {
  const maxVal = Math.max(...data.flatMap((d) => [d.collected, d.pending]), 1);
  const W = 540;
  const H = 140;
  const PAD = { top: 10, right: 10, bottom: 30, left: 55 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const barW = chartW / data.length;
  const BAR = barW * 0.32;
  const GAP = 4;

  const yTick = (v: number) => {
    const y = PAD.top + chartH - (v / maxVal) * chartH;
    return y;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => maxVal * f);

  return (
    <svg width={W} height={H} style={{ display: 'block', maxWidth: '100%' }}>
      {/* Grid lines */}
      {ticks.map((t) => (
        <g key={t}>
          <line
            x1={PAD.left} x2={PAD.left + chartW}
            y1={yTick(t)} y2={yTick(t)}
            stroke="#e5e7eb" strokeWidth={1}
          />
          <text
            x={PAD.left - 6} y={yTick(t) + 4}
            textAnchor="end" fontSize={9} fill="#9ca3af"
          >
            {t === 0 ? '0' : `Q${(t / 1000).toFixed(0)}k`}
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = PAD.left + i * barW + (barW - BAR * 2 - GAP) / 2;
        const collH = (d.collected / maxVal) * chartH;
        const pendH = (d.pending / maxVal) * chartH;
        return (
          <g key={d.month}>
            {/* Collected */}
            <rect
              x={x} y={PAD.top + chartH - collH}
              width={BAR} height={collH}
              fill="#0d9488" rx={2}
            />
            {/* Pending */}
            <rect
              x={x + BAR + GAP} y={PAD.top + chartH - pendH}
              width={BAR} height={pendH}
              fill="#99f6e4" rx={2}
            />
            {/* Label */}
            <text
              x={x + BAR + GAP / 2} y={H - PAD.bottom + 14}
              textAnchor="middle" fontSize={9} fill="#6b7280"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Leyenda */}
      <rect x={PAD.left} y={H - 4} width={10} height={6} fill="#0d9488" rx={1} />
      <text x={PAD.left + 13} y={H} fontSize={8} fill="#6b7280">Cobrado</text>
      <rect x={PAD.left + 70} y={H - 4} width={10} height={6} fill="#99f6e4" rx={1} />
      <text x={PAD.left + 83} y={H} fontSize={8} fill="#6b7280">Pendiente</text>
    </svg>
  );
}

// ── Barra de porcentaje ──────────────────────────────────────────────────────
function PctBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', minWidth: 30, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
    </div>
  );
}

// ── Tabla de proyección por semana ───────────────────────────────────────────
function WeekTable({ byWeek, hasData }: { byWeek: WeekProjection[]; hasData: boolean }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr style={{ background: '#f9fafb' }}>
          <th style={TH}>Semana</th>
          <th style={{ ...TH, textAlign: 'center' }}>Citas</th>
          <th style={{ ...TH, textAlign: 'right' }}>Estimado</th>
        </tr>
      </thead>
      <tbody>
        {byWeek.map((w) => (
          <tr key={w.label} style={{ borderBottom: '1px solid #f0f0f0' }}>
            <td style={TD}>{w.label}</td>
            <td style={{ ...TD, textAlign: 'center' }}>{w.appointments}</td>
            <td style={{ ...TD, textAlign: 'right', color: hasData ? '#0d9488' : '#9ca3af' }}>
              {hasData ? fmt(w.estimated) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
      {hasData && (
        <tfoot>
          <tr style={{ borderTop: '2px solid #e5e7eb' }}>
            <td style={{ ...TD, fontWeight: 700 }}>Total proyectado</td>
            <td style={{ ...TD, textAlign: 'center', fontWeight: 700 }}>
              {byWeek.reduce((s, w) => s + w.appointments, 0)}
            </td>
            <td style={{ ...TD, textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>
              {fmt(byWeek.reduce((s, w) => s + w.estimated, 0))}
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

const TH: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 600, borderBottom: '1px solid #e5e7eb' };
const TD: React.CSSProperties = { padding: '8px 10px', fontSize: 12, color: '#111' };

// ── Componente principal ─────────────────────────────────────────────────────
export function FinancesPrint() {
  const [params] = useSearchParams();
  const now = new Date();
  const year = parseInt(params.get('year') || String(now.getFullYear()), 10);
  const month = parseInt(params.get('month') || String(now.getMonth() + 1), 10);

  const { data, isLoading, isError } = useFinancialSummary(year, month);

  useEffect(() => {
    if (!data) return;
    document.title = `Informe Financiero — ${MONTH_NAMES[month - 1]} ${year}`;
    const t = setTimeout(() => window.print(), 500);
    return () => clearTimeout(t);
  }, [data, month, year]);

  if (isLoading) {
    return (
      <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', fontFamily: 'Arial, sans-serif', color: '#6b7280' }}>
        Generando informe…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', fontFamily: 'Arial, sans-serif', color: '#dc2626' }}>
        No se pudo cargar la información financiera.
      </div>
    );
  }

  const { currentMonth, lastSixMonths, byServiceType, projection, recentReceipts } = data;
  const typeTotal = byServiceType.reduce((s, t) => s + t.total, 0);
  const generatedAt = new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', color: '#111', background: '#fff' }}>
      <style>{`
        @media print {
          html, body { margin: 0; height: auto; background: #fff; }
          .no-print { display: none !important; }
          @page { margin: 15mm 20mm; size: A4; }
        }
        body { background: #f9fafb; }
      `}</style>

      {/* Barra de acciones */}
      <div className="no-print" style={{ position: 'sticky', top: 0, display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '10px 16px', background: 'rgba(255,255,255,0.9)', borderBottom: '1px solid #e5e7eb', backdropFilter: 'blur(4px)', zIndex: 10 }}>
        <button
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#0d9488', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
        >
          <Printer size={14} /> Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
        >
          <X size={14} /> Cerrar
        </button>
      </div>

      {/* Hoja */}
      <div style={{ maxWidth: 720, margin: '32px auto 0', background: '#fff', padding: '36px 40px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Encabezado */}
        <div style={{ borderBottom: '3px solid #0d9488', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0d9488' }}>{CLINIC.name}</h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{CLINIC.tagline}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>INFORME FINANCIERO</p>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: '#0d9488', fontWeight: 600 }}>
              {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Cobrado', value: currentMonth.collected, color: '#0d9488', bg: '#f0fdf4' },
            { label: 'Pendiente', value: currentMonth.pending, color: '#d97706', bg: '#fffbeb' },
            { label: 'Proyectado', value: projection.estimatedTotal, color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Borradores', value: currentMonth.draft, color: '#64748b', bg: '#f8fafc' },
          ].map((k) => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 8, padding: '12px 14px', border: `1px solid ${k.color}22` }}>
              <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6b7280' }}>{k.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 700, color: k.color }}>{fmt(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Histórico 6 meses */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
            Ingresos últimos 6 meses
          </h2>
          <BarChartSvg data={lastSixMonths} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={TH}>Mes</th>
                <th style={{ ...TH, textAlign: 'right' }}>Cobrado</th>
                <th style={{ ...TH, textAlign: 'right' }}>Pendiente</th>
                <th style={{ ...TH, textAlign: 'right' }}>Total período</th>
              </tr>
            </thead>
            <tbody>
              {lastSixMonths.map((m) => (
                <tr key={m.month} style={{ borderBottom: '1px solid #f0f0f0', fontWeight: m.month === `${year}-${String(month).padStart(2, '0')}` ? 700 : 400, background: m.month === `${year}-${String(month).padStart(2, '0')}` ? '#f0fdf4' : 'transparent' }}>
                  <td style={TD}>{m.label}</td>
                  <td style={{ ...TD, textAlign: 'right', color: '#0d9488' }}>{fmt(m.collected)}</td>
                  <td style={{ ...TD, textAlign: 'right', color: '#d97706' }}>{fmt(m.pending)}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>{fmt(m.collected + m.pending)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Desglose por tipo */}
        {byServiceType.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
              Desglose por tipo — {MONTH_NAMES[month - 1]} {year}
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={TH}>Categoría</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={{ ...TH, width: 180 }}>Proporción</th>
                </tr>
              </thead>
              <tbody>
                {byServiceType.map((t) => {
                  const pct = typeTotal > 0 ? (t.total / typeTotal) * 100 : 0;
                  return (
                    <tr key={t.type} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ ...TD, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[t.type] ?? '#94a3b8', flexShrink: 0 }} />
                        {t.label}
                      </td>
                      <td style={{ ...TD, textAlign: 'right', color: '#0d9488', fontWeight: 600 }}>{fmt(t.total)}</td>
                      <td style={{ ...TD }}>
                        <PctBar pct={pct} color={TYPE_COLORS[t.type] ?? '#94a3b8'} />
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ ...TD, fontWeight: 700 }}>Total</td>
                  <td style={{ ...TD, textAlign: 'right', fontWeight: 700 }}>{fmt(typeTotal)}</td>
                  <td style={TD} />
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Proyección */}
        <section style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Proyección — próximas 4 semanas
            </h2>
            <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 99, padding: '2px 8px', fontWeight: 600 }}>~estimado</span>
          </div>
          {projection.hasData ? (
            <p style={{ fontSize: 11, color: '#6b7280', margin: '0 0 10px' }}>
              Ticket promedio del mes: <strong style={{ color: '#111' }}>{fmt(projection.avgTicket)}</strong> ·
              Citas agendadas (30 días): <strong style={{ color: '#111' }}>{projection.upcomingCount}</strong>
            </p>
          ) : (
            <p style={{ fontSize: 11, color: '#d97706', margin: '0 0 10px', background: '#fffbeb', padding: '6px 10px', borderRadius: 6 }}>
              Sin recibos pagados en el mes seleccionado. La proyección económica no está disponible.
            </p>
          )}
          <WeekTable byWeek={projection.byWeek} hasData={projection.hasData} />
        </section>

        {/* Recibos recientes */}
        {recentReceipts.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 }}>
              Recibos recientes
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={TH}>Paciente</th>
                  <th style={TH}>Fecha</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={TD}>{r.patientName}</td>
                    <td style={{ ...TD, color: '#6b7280' }}>
                      {new Date(r.issuedAt).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600 }}>{fmt(r.total)}</td>
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: STATUS_COLOR[r.status] ?? '#6b7280' }}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Pie */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>{CLINIC.name} · {CLINIC.address} · {CLINIC.phone}</p>
          <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Generado el {generatedAt}</p>
        </div>
      </div>
    </div>
  );
}
