import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Search, Save, Send, Printer, CheckCircle,
  AlertCircle, ChevronLeft, Package, Stethoscope, FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { billingApi } from './billing.api';
import type { BillableItem, BillableType, DraftItem, ReceiptStatus } from './types';

// ─── Utils ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });

const TYPE_ICON: Record<BillableType, typeof Stethoscope> = {
  SERVICE: Stethoscope,
  PRODUCT: Package,
  SUPPLY: FlaskConical,
};

const TYPE_LABEL: Record<BillableType, string> = {
  SERVICE: 'Servicio',
  PRODUCT: 'Producto',
  SUPPLY: 'Insumo',
};

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

let tempIdCounter = 0;
function nextTempId() { return `tmp_${++tempIdCounter}`; }

// ─── Patient picker ───────────────────────────────────────────────────────────

function PatientSearch({ value, onSelect }: {
  value: { id: string; name: string; email: string | null } | null;
  onSelect: (p: { id: string; name: string; email: string | null }) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);

  const { data: results = [] } = useQuery({
    queryKey: ['patient-search-billing', q],
    queryFn: async () => {
      if (q.trim().length < 2) return [];
      const res = await import('@/lib/api').then(({ api }) =>
        api<{ items: { id: string; firstName: string; lastName: string; email: string | null }[] }>(
          `/patients?q=${encodeURIComponent(q)}&pageSize=8`,
        ),
      );
      return res.items;
    },
    enabled: q.trim().length >= 2,
  });

  function pick(p: { id: string; firstName: string; lastName: string; email: string | null }) {
    onSelect({ id: p.id, name: `${p.firstName} ${p.lastName}`, email: p.email });
    setOpen(false);
    setQ('');
  }

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="font-medium text-sm">{value.name}</p>
          {value.email && <p className="text-xs text-muted-foreground">{value.email}</p>}
          {!value.email && <p className="text-xs text-amber-600">Sin correo electrónico</p>}
        </div>
        <button type="button" onClick={() => onSelect({ id: '', name: '', email: null })} className="text-xs text-muted-foreground hover:text-foreground underline">
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Buscar paciente por nombre…"
          className="pl-9"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => pick(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-left"
            >
              <span className="font-medium">{p.firstName} {p.lastName}</span>
              {p.email && <span className="text-muted-foreground text-xs">{p.email}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ReceiptBuilderPage() {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Estado del recibo en construcción
  const [patient, setPatient] = useState<{ id: string; name: string; email: string | null } | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<ReceiptStatus>('DRAFT');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customQty, setCustomQty] = useState('1');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Cargar recibo existente
  const { data: existingReceipt, isLoading: loadingReceipt } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => billingApi.getReceipt(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (existingReceipt) {
      setPatient({
        id: existingReceipt.patient.id,
        name: `${existingReceipt.patient.firstName} ${existingReceipt.patient.lastName}`,
        email: existingReceipt.patient.email,
      });
      setItems(existingReceipt.items.map((it) => ({
        tempId: nextTempId(),
        billableItemId: it.billableItemId ?? undefined,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
      })));
      setNotes(existingReceipt.notes ?? '');
      setStatus(existingReceipt.status as ReceiptStatus);
    }
  }, [existingReceipt]);

  // Pre-seleccionar paciente desde query param
  useEffect(() => {
    const pid = searchParams.get('pacienteId');
    const pname = searchParams.get('nombre');
    const pemail = searchParams.get('email');
    if (pid && pname && !patient) {
      setPatient({ id: pid, name: pname, email: pemail });
    }
  }, [searchParams, patient]);

  const { data: catalog = [] } = useQuery({
    queryKey: ['billable-items'],
    queryFn: billingApi.listItems,
  });

  const activeCatalog = catalog.filter((c) => c.isActive);
  const filteredCatalog = activeCatalog.filter((c) =>
    c.name.toLowerCase().includes(catalogSearch.toLowerCase()),
  );

  // Total en tiempo real
  const total = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

  function addFromCatalog(item: BillableItem) {
    setItems((prev) => {
      const existing = prev.find((it) => it.billableItemId === item.id);
      if (existing) {
        return prev.map((it) =>
          it.billableItemId === item.id ? { ...it, quantity: it.quantity + 1 } : it,
        );
      }
      return [...prev, { tempId: nextTempId(), billableItemId: item.id, description: item.name, quantity: 1, unitPrice: item.price }];
    });
  }

  function addCustomItem(e: FormEvent) {
    e.preventDefault();
    const price = parseFloat(customPrice);
    const qty = parseInt(customQty, 10);
    if (!customDesc.trim() || isNaN(price) || price < 0 || isNaN(qty) || qty < 1) return;
    setItems((prev) => [...prev, { tempId: nextTempId(), description: customDesc.trim(), quantity: qty, unitPrice: price }]);
    setCustomDesc('');
    setCustomPrice('');
    setCustomQty('1');
  }

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  }

  function changeQty(tempId: string, qty: number) {
    if (qty < 1) return;
    setItems((prev) => prev.map((it) => it.tempId === tempId ? { ...it, quantity: qty } : it));
  }

  function changePrice(tempId: string, price: number) {
    if (price < 0) return;
    setItems((prev) => prev.map((it) => it.tempId === tempId ? { ...it, unitPrice: price } : it));
  }

  const saveMutation = useMutation({
    mutationFn: async (targetStatus: ReceiptStatus) => {
      if (!patient?.id || items.length === 0) throw new Error('Completa el recibo antes de guardar');
      const payload = {
        notes: notes || undefined,
        status: targetStatus,
        items: items.map((it, idx) => ({
          billableItemId: it.billableItemId,
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          order: idx,
        })),
      };
      if (id) {
        return billingApi.updateReceipt(id, payload);
      }
      return billingApi.createReceipt({ patientId: patient.id, ...payload });
    },
    onSuccess: (receipt, targetStatus) => {
      setStatus(targetStatus);
      qc.invalidateQueries({ queryKey: ['receipts'] });
      if (!id) navigate(`/cobros/${receipt.id}`, { replace: true });
    },
    onError: (err) => setSaveError(err instanceof ApiError ? err.message : String(err)),
  });

  async function handleSendEmail() {
    const receiptId = id ?? existingReceipt?.id;
    if (!receiptId) return;
    setEmailStatus('sending');
    setEmailError(null);
    try {
      await billingApi.sendEmail(receiptId);
      setEmailStatus('ok');
    } catch (err) {
      setEmailStatus('error');
      setEmailError(err instanceof ApiError ? err.message : 'Error al enviar el correo');
    }
  }

  const canSave = !!patient?.id && items.length > 0;
  const receiptId = id ?? existingReceipt?.id;
  const savedStatus = existingReceipt?.status as ReceiptStatus | undefined;
  const isReadOnly = savedStatus === 'PAID' || savedStatus === 'CANCELLED';

  if (loadingReceipt) {
    return (
      <div className="space-y-4 animate-pulse p-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/cobros')}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{id ? 'Recibo' : 'Nuevo recibo'}</h1>
        </div>
        {status && (
          <span className={cn('rounded-full px-3 py-1 text-xs font-medium', STATUS_COLOR[status])}>
            {STATUS_LABEL[status]}
          </span>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* ── Panel izquierdo: controles ── */}
        <div className="space-y-6 overflow-y-auto">
          {/* Paciente */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold">Paciente</h2>
            {isReadOnly
              ? <p className="text-sm">{patient?.name ?? '—'}</p>
              : <PatientSearch value={patient} onSelect={(p) => setPatient(p.id ? p : null)} />}
          </div>

          {/* Catálogo */}
          {!isReadOnly && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Agregar del catálogo</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Buscar servicio, producto o insumo…"
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {filteredCatalog.length === 0
                  ? <p className="text-xs text-muted-foreground text-center py-4">Sin resultados</p>
                  : filteredCatalog.map((item) => {
                      const Icon = TYPE_ICON[item.type];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addFromCatalog(item)}
                          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{TYPE_LABEL[item.type]}</span>
                          <span className="font-semibold tabular-nums shrink-0">{fmt(item.price)}</span>
                          <Plus className="h-4 w-4 text-teal-600 shrink-0" />
                        </button>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Artículo personalizado */}
          {!isReadOnly && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Artículo personalizado</h2>
              <form onSubmit={addCustomItem} className="space-y-3">
                <Input
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="Descripción del artículo"
                  maxLength={500}
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={customQty}
                    onChange={(e) => setCustomQty(e.target.value)}
                    placeholder="Cant."
                    min={1}
                    className="w-20"
                  />
                  <Input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="Precio unitario"
                    min={0}
                    step="0.01"
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!customDesc.trim() || !customPrice}
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Notas */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h2 className="text-sm font-semibold">Notas</h2>
            {isReadOnly
              ? <p className="text-sm text-muted-foreground">{notes || 'Sin notas'}</p>
              : (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Observaciones, acuerdos de pago, etc."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              )}
          </div>

          {/* Estado (solo para recibos guardados) */}
          {receiptId && !isReadOnly && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h2 className="text-sm font-semibold">Estado del recibo</h2>
              <div className="flex flex-wrap gap-2">
                {(['DRAFT', 'ISSUED', 'PAID', 'CANCELLED'] as ReceiptStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      status === s ? STATUS_COLOR[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-muted text-muted-foreground hover:bg-muted/80',
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Panel derecho: vista previa del recibo ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-card p-6 flex-1 flex flex-col">
            {/* Encabezado del recibo */}
            <div className="border-b border-border pb-4 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Recibo de pago</p>
                  {receiptId && <p className="text-xs text-muted-foreground mt-0.5">#{receiptId.slice(-8).toUpperCase()}</p>}
                </div>
                <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              {patient && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="font-semibold">{patient.name}</p>
                  {patient.email && <p className="text-xs text-muted-foreground">{patient.email}</p>}
                </div>
              )}
            </div>

            {/* Líneas */}
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12 flex-1">
                Agrega artículos del catálogo o crea uno personalizado
              </p>
            ) : (
              <div className="flex-1 space-y-0 overflow-y-auto -mx-1 px-1">
                {/* Cabecera de tabla */}
                <div className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 text-xs text-muted-foreground font-medium pb-1.5 border-b border-border mb-1">
                  <span>Descripción</span>
                  <span className="text-center">Cant.</span>
                  <span className="text-right">P. unit.</span>
                  <span className="text-right">Subtotal</span>
                  <span />
                </div>
                {items.map((it) => (
                  <div key={it.tempId} className="grid grid-cols-[1fr_60px_90px_90px_32px] gap-2 items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm truncate">{it.description}</span>
                    {isReadOnly
                      ? <span className="text-sm text-center tabular-nums">{it.quantity}</span>
                      : (
                        <input
                          type="number"
                          value={it.quantity}
                          onChange={(e) => changeQty(it.tempId, parseInt(e.target.value, 10))}
                          min={1}
                          className="w-full rounded border border-input bg-background px-1.5 py-1 text-sm text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      )}
                    {isReadOnly
                      ? <span className="text-sm text-right tabular-nums">{fmt(it.unitPrice)}</span>
                      : (
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) => changePrice(it.tempId, parseFloat(e.target.value))}
                          min={0}
                          step="0.01"
                          className="w-full rounded border border-input bg-background px-1.5 py-1 text-sm text-right tabular-nums focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      )}
                    <span className="text-sm font-medium text-right tabular-nums">{fmt(it.quantity * it.unitPrice)}</span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.tempId)}
                        className="p-1 rounded text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{items.length} artículo{items.length !== 1 ? 's' : ''}</span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-teal-600 tabular-nums">{fmt(total)}</p>
              </div>
            </div>

            {notes && (
              <p className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
                <strong>Notas:</strong> {notes}
              </p>
            )}
          </div>

          {/* Acciones */}
          <div className="space-y-3">
            {saveError && (
              <p className="text-sm text-danger flex items-center gap-2" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" /> {saveError}
              </p>
            )}

            {!isReadOnly && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => { setSaveError(null); saveMutation.mutate('DRAFT'); }}
                  disabled={!canSave || saveMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending && status === 'DRAFT' ? 'Guardando…' : 'Guardar borrador'}
                </Button>
                <Button
                  onClick={() => { setSaveError(null); saveMutation.mutate(receiptId ? status : 'ISSUED'); }}
                  disabled={!canSave || saveMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4" />
                  {saveMutation.isPending && status !== 'DRAFT' ? 'Emitiendo…' : receiptId ? 'Guardar cambios' : 'Emitir recibo'}
                </Button>
              </div>
            )}

            {receiptId && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(`/cobros/${receiptId}/imprimir`, '_blank')}
                  className="flex-1"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSendEmail}
                  disabled={!patient?.email || emailStatus === 'sending'}
                  title={!patient?.email ? 'El paciente no tiene correo' : undefined}
                  className="flex-1"
                >
                  <Send className="h-4 w-4" />
                  {emailStatus === 'sending' ? 'Enviando…' : 'Enviar por correo'}
                </Button>
              </div>
            )}

            {emailStatus === 'ok' && (
              <p className="text-sm text-teal-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Correo enviado a {patient?.email}
              </p>
            )}
            {emailStatus === 'error' && (
              <p className="text-sm text-danger flex items-center gap-2" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" /> {emailError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
