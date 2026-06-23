import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { ApiError } from '@/lib/api';
import { billingApi } from './billing.api';
import type { BillableItem, BillableType } from './types';

const TYPE_LABELS: Record<BillableType, string> = {
  SERVICE: 'Servicio',
  PRODUCT: 'Producto',
  SUPPLY: 'Insumo',
};

const TYPE_COLORS: Record<BillableType, string> = {
  SERVICE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  PRODUCT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  SUPPLY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
};

const fmt = (n: number) => n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' });

interface FormState { name: string; description: string; type: BillableType; price: string }
const EMPTY: FormState = { name: '', description: '', type: 'SERVICE', price: '' };

export function BillableItemsSection() {
  const qc = useQueryClient();
  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['billable-items'],
    queryFn: billingApi.listItems,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillableItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: billingApi.createItem,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billable-items'] }); close_(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al guardar'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof billingApi.updateItem>[1] }) =>
      billingApi.updateItem(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['billable-items'] }); close_(); },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'Error al guardar'),
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: BillableItem) {
    setEditing(item);
    setForm({ name: item.name, description: item.description ?? '', type: item.type, price: String(item.price) });
    setError(null);
    setOpen(true);
  }

  function close_() { setOpen(false); setEditing(null); setError(null); }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) { setError('Precio inválido'); return; }
    const body = { name: form.name.trim(), description: form.description.trim() || undefined, type: form.type, price };
    if (editing) {
      updateMutation.mutate({ id: editing.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function toggleActive(item: BillableItem) {
    updateMutation.mutate({ id: item.id, body: { isActive: !item.isActive } });
  }

  const isBusy = createMutation.isPending || updateMutation.isPending;

  // Agrupar por tipo
  const grouped = items.reduce<Record<BillableType, BillableItem[]>>(
    (acc, it) => { (acc[it.type] ??= []).push(it); return acc; },
    { SERVICE: [], PRODUCT: [], SUPPLY: [] },
  );

  if (isLoading) return <div className="space-y-2 animate-pulse">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-muted rounded-xl" />)}</div>;
  if (isError) return <p className="text-sm text-danger">No se pudo cargar el catálogo.</p>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Catálogo de cobros</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Servicios, productos e insumos disponibles para agregar a los recibos.
            </p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" /> Nuevo artículo
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            El catálogo está vacío. Agrega servicios o productos para poder crear recibos.
          </p>
        ) : (
          <div className="space-y-6">
            {(Object.entries(grouped) as [BillableType, BillableItem[]][])
              .filter(([, list]) => list.length > 0)
              .map(([type, list]) => (
                <div key={type}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    {TYPE_LABELS[type]}s
                  </h3>
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                    {list.map((item) => (
                      <div
                        key={item.id}
                        className={cn('flex items-center gap-3 px-4 py-3 bg-card', !item.isActive && 'opacity-50')}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                          )}
                        </div>
                        <span className={cn('text-xs rounded-full px-2.5 py-0.5 font-medium shrink-0', TYPE_COLORS[item.type])}>
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">{fmt(item.price)}</span>
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(item)}
                          title={item.isActive ? 'Desactivar' : 'Activar'}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {item.isActive
                            ? <ToggleRight className="h-4 w-4 text-teal-600" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={close_} title={editing ? 'Editar artículo' : 'Nuevo artículo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Nombre *</span>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={200} placeholder="Ej. Limpieza dental" />
          </label>
          <label className="space-y-1.5 block">
            <span className="text-sm font-medium">Descripción</span>
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} placeholder="Opcional" />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Tipo *</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BillableType }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {(Object.entries(TYPE_LABELS) as [BillableType, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 block">
              <span className="text-sm font-medium">Precio (Q) *</span>
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                required
                min={0}
                step="0.01"
                placeholder="0.00"
              />
            </label>
          </div>
          {error && <p className="text-sm text-danger" role="alert">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close_} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" disabled={isBusy || !form.name.trim() || !form.price}>
              {isBusy ? 'Guardando…' : editing ? 'Guardar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
