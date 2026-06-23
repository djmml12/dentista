import { useState } from 'react';
import { Pencil, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import {
  useCreateQuickNote,
  useDeleteQuickNote,
  useQuickNotes,
  useUpdateQuickNote,
} from './quicknotes.api';

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function QuickNotesPanel({ patientId }: { patientId: string }) {
  const { user } = useAuth();
  const canWrite = user?.role === 'ADMIN' || user?.role === 'DENTIST';
  const canDelete = canWrite;
  const { data = [], isLoading } = useQuickNotes(patientId);
  const create = useCreateQuickNote(patientId);
  const update = useUpdateQuickNote(patientId);
  const del = useDeleteQuickNote(patientId);

  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);

  async function add() {
    const body = draft.trim();
    if (!body) return;
    await create.mutateAsync(body);
    setDraft('');
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium">Notas rápidas</h3>
      </div>

      {canWrite && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe una nota rápida sobre el paciente…"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm transition-colors focus:border-primary/50"
          />
          <Button onClick={add} disabled={!draft.trim() || create.isPending} className="self-start">
            Añadir
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {isLoading ? (
          <div className="skeleton h-12 rounded-xl" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay notas rápidas.</p>
        ) : (
          data.map((n) => (
            <div key={n.id} className="rounded-xl border border-border px-3 py-2 motion-safe:animate-event-pop">
              {canWrite && editing?.id === n.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={editing.body}
                    onChange={(e) => setEditing({ id: n.id, body: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary/50"
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancelar</Button>
                    <Button
                      size="sm"
                      disabled={!editing.body.trim() || update.isPending}
                      onClick={async () => {
                        await update.mutateAsync({ id: n.id, body: editing.body.trim() });
                        setEditing(null);
                      }}
                    >
                      Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{n.author.name} · {fmt(n.createdAt)}</p>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing({ id: n.id, body: n.body })}
                        className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
                        aria-label="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={async () => { if (confirm('¿Eliminar esta nota?')) await del.mutateAsync(n.id); }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:text-danger active:scale-90"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
