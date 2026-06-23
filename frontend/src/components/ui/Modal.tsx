import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  // Mantenemos el modal montado durante la animación de salida.
  const [render, setRender] = useState(open);

  useEffect(() => {
    if (open) {
      setRender(true);
      return;
    }
    // Cierre: esperamos a que termine la animación de salida y desmontamos.
    const t = setTimeout(() => setRender(false), 200);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!render) return null;

  const entering = open;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className={cn(
          'absolute inset-0 bg-foreground/10 backdrop-blur-sm',
          entering ? 'motion-safe:animate-overlay-in' : 'motion-safe:animate-overlay-out',
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        // will-change libera el elemento a su propia capa para componer a 60FPS.
        style={{ willChange: 'transform, opacity' }}
        className={cn(
          'relative w-full bg-card rounded-2xl border border-border shadow-card overflow-hidden',
          size === 'md' ? 'max-w-lg' : 'max-w-3xl',
          entering ? 'motion-safe:animate-modal-in' : 'motion-safe:animate-modal-out',
        )}
      >
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted active:scale-90"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}
