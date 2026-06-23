import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const from = prevTarget.current;
    prevTarget.current = target;
    startRef.current = null;
    cancelAnimationFrame(rafRef.current);

    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

const fmt = (n: number) =>
  n.toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });

interface Props {
  label: string;
  value: number;
  icon: ReactNode;
  description?: string;
  prefix?: string;
  isCurrency?: boolean;
  colorClass?: string;
  delay?: number;
}

export function KpiCard({ label, value, icon, description, isCurrency = true, colorClass = 'text-primary', delay = 0 }: Props) {
  const [visible, setVisible] = useState(false);
  const animated = useCountUp(visible ? value : 0, 650);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-5 shadow-sm transition-all',
        'opacity-0 translate-y-3',
        visible && 'opacity-100 translate-y-0',
      )}
      style={{ transition: `opacity 200ms ease ${delay}ms, transform 200ms ease ${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', colorClass)}>
            {isCurrency ? fmt(animated) : Math.round(animated).toLocaleString('es-GT')}
          </p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn('ml-3 rounded-lg p-2.5 bg-primary/10', colorClass)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
