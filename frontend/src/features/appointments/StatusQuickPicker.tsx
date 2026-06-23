import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import { STATUS_COLORS, STATUS_LABELS, type AppointmentStatus } from '@/types/appointment';

interface Props {
  status: AppointmentStatus;
  onChange: (status: AppointmentStatus) => void;
  pending?: boolean;
}

export function StatusQuickPicker({ status, onChange, pending }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  function handleTrigger(e: React.MouseEvent) {
    e.stopPropagation();
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 168;
    const left = Math.min(rect.left, window.innerWidth - dropdownWidth - 8);
    setPos({ top: rect.bottom + 4, left });
    setOpen((o) => !o);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTrigger}
        disabled={pending}
        aria-label="Cambiar estado"
        className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 transition-transform hover:scale-125 active:scale-90 disabled:opacity-50"
        style={{ background: STATUS_COLORS[status] }}
      />
      {open &&
        createPortal(
          <div
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-[9999] min-w-[10.5rem] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {(Object.entries(STATUS_LABELS) as [AppointmentStatus, string][]).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (s !== status) onChange(s);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STATUS_COLORS[s] }}
                />
                <span className={s === status ? 'font-medium' : ''}>{label}</span>
                {s === status && <Check className="ml-auto h-3 w-3 text-muted-foreground" />}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
