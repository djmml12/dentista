import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { usePrescription } from './queries';
import { CLINIC } from './clinic';
import type { Prescription } from '@/types/prescription';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
function age(birth: string | null): string {
  if (!birth) return '';
  const years = Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000));
  return years >= 0 ? `${years} años` : '';
}
function detailLine(it: Prescription['items'][number]): string {
  return [it.dose, it.frequency, it.duration, it.quantity ? `Cantidad: ${it.quantity}` : '']
    .filter(Boolean)
    .join(' · ');
}

export function PrescriptionPrint() {
  const { id } = useParams<{ id: string }>();
  const { data: rx, isLoading, isError } = usePrescription(id);

  useEffect(() => {
    if (!rx) return;
    const t = setTimeout(() => window.print(), 350); // imprime al cargar
    return () => clearTimeout(t);
  }, [rx]);

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Cargando receta…</div>;
  }
  if (isError || !rx) {
    return <div className="grid min-h-screen place-items-center text-sm text-danger">No se encontró la receta.</div>;
  }

  const patientName = `${rx.patient.firstName} ${rx.patient.lastName}`;
  const patientAge = age(rx.patient.birthDate);

  return (
    <div className="min-h-screen bg-muted/40 print:bg-white">
      {/* Barra de acciones — no se imprime */}
      <div className="print:hidden sticky top-0 flex items-center justify-end gap-2 border-b border-border bg-card/80 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-transform active:scale-95"
        >
          <Printer className="h-4 w-4" /> Imprimir
        </button>
        <button
          type="button"
          onClick={() => window.close()}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm transition-colors hover:bg-muted"
        >
          <X className="h-4 w-4" /> Cerrar
        </button>
      </div>

      {/* Hoja de receta */}
      <div className="mx-auto my-8 max-w-[800px] bg-white p-12 text-[#1f2937] shadow-card print:my-0 print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-[#0f766e] pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0f766e]">{CLINIC.name}</h1>
            <p className="text-sm text-[#64748b]">{CLINIC.tagline}</p>
          </div>
          <div className="text-right text-xs text-[#64748b]">
            <p>{CLINIC.address}</p>
            <p>{CLINIC.phone}</p>
          </div>
        </header>

        <div className="mt-6 flex items-end justify-between">
          <h2 className="text-lg font-semibold tracking-wide">RECETA MÉDICA</h2>
          <p className="text-sm text-[#64748b]">Fecha: {fmtDate(rx.issuedAt)}</p>
        </div>

        <section className="mt-4 rounded-lg bg-[#f1f5f9] px-4 py-3 text-sm">
          <p>
            <span className="text-[#64748b]">Paciente: </span>
            <span className="font-medium">{patientName}</span>
            {rx.patient.documentId ? <span className="text-[#64748b]">  ·  Doc: {rx.patient.documentId}</span> : null}
            {patientAge ? <span className="text-[#64748b]">  ·  {patientAge}</span> : null}
          </p>
          {rx.diagnosis && (
            <p className="mt-1">
              <span className="text-[#64748b]">Diagnóstico: </span>
              {rx.diagnosis}
            </p>
          )}
        </section>

        {/* Rx symbol + medicamentos */}
        <section className="mt-6">
          <div className="mb-2 text-3xl font-serif italic text-[#0f766e]">℞</div>
          <ol className="space-y-4">
            {rx.items.map((it, i) => (
              <li key={it.id} className="flex gap-3 break-inside-avoid">
                <span className="font-semibold tabular-nums text-[#64748b]">{i + 1}.</span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-base font-semibold">{it.drugName}</span>
                    {it.presentation && <span className="text-sm text-[#64748b]">{it.presentation}</span>}
                  </div>
                  {detailLine(it) && <div className="text-sm">{detailLine(it)}</div>}
                  {it.instructions && <div className="text-sm italic text-[#475569]">{it.instructions}</div>}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {rx.notes && (
          <section className="mt-6 text-sm">
            <p className="font-medium">Indicaciones generales</p>
            <p className="whitespace-pre-wrap text-[#475569]">{rx.notes}</p>
          </section>
        )}

        {/* Firma */}
        <footer className="mt-16 break-inside-avoid">
          <div className="ml-auto w-72 border-t border-[#1f2937] pt-2 text-center text-sm">
            <p className="font-medium">{rx.prescriber.name}</p>
            {rx.prescriber.specialty && <p className="text-[#64748b]">{rx.prescriber.specialty}</p>}
            <p className="text-[#64748b]">
              Cédula profesional: {rx.prescriber.licenseNumber ?? '__________'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
