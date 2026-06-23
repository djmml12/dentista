import { useEffect, useRef, useState } from 'react';
import { searchMedications } from './prescriptions.api';
import type { Medication } from '@/types/prescription';

interface Props {
  value: string;
  onChange: (name: string) => void;
  /** Al elegir del catálogo, también rellena la presentación (forma + concentración). */
  onSelect: (med: Medication) => void;
  placeholder?: string;
}

function presentationLabel(m: Medication): string {
  return [m.form, m.strength].filter(Boolean).join(' ');
}

export function MedicationAutocomplete({ value, onChange, onSelect, placeholder }: Props) {
  const [results, setResults] = useState<Medication[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const skipNext = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      searchMedications(q)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setActive(0);
          setOpen(r.length > 0);
        })
        .catch(() => setResults([]));
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [value]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function pick(m: Medication) {
    skipNext.current = true; // evita reabrir el dropdown tras seleccionar
    onChange(m.name);
    onSelect(m);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder ?? 'Medicamento'}
        className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm transition-colors focus:border-primary/50"
        autoComplete="off"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-card motion-safe:animate-fade-in">
          {results.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(m)}
                className={
                  'flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm transition-colors ' +
                  (i === active ? 'bg-primary/10' : 'hover:bg-muted')
                }
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">{presentationLabel(m)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
