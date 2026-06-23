import { useEffect, useRef, useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Sun, Contrast as ContrastIcon, RefreshCcw } from 'lucide-react';

interface Props {
  url: string;
  fileName: string;
  onClose: () => void;
}

export function Lightbox({ url, fileName, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function reset() {
    setScale(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/90 flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 text-white">
        <span className="text-sm truncate">{fileName}</span>
        <div className="flex items-center gap-1">
          <ToolBtn onClick={() => setScale((s) => Math.min(8, s * 1.2))} label="Acercar"><ZoomIn className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => setScale((s) => Math.max(0.2, s / 1.2))} label="Alejar"><ZoomOut className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => setRotation((r) => r + 90)} label="Rotar"><RotateCw className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={reset} label="Reiniciar"><RefreshCcw className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={onClose} label="Cerrar"><X className="h-4 w-4" /></ToolBtn>
        </div>
      </header>
      <div
        className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
        onMouseDown={(e) => { dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y }; }}
        onMouseMove={(e) => {
          if (!dragRef.current) return;
          setOffset({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y });
        }}
        onMouseUp={() => { dragRef.current = null; }}
        onMouseLeave={() => { dragRef.current = null; }}
        onWheel={(e) => {
          e.preventDefault();
          setScale((s) => Math.min(8, Math.max(0.2, s * (e.deltaY < 0 ? 1.1 : 0.9))));
        }}
      >
        <img
          src={url}
          alt={fileName}
          draggable={false}
          className="absolute top-1/2 left-1/2 select-none"
          style={{
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale}) rotate(${rotation}deg)`,
            filter: `brightness(${brightness}%) contrast(${contrast}%)`,
            transition: dragRef.current ? 'none' : 'transform 120ms',
            maxWidth: 'none',
          }}
        />
      </div>
      <footer className="px-4 py-3 bg-neutral-900/95 text-white flex items-center gap-6">
        <label className="flex items-center gap-2 text-xs">
          <Sun className="h-4 w-4" />
          <input type="range" min={20} max={200} value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} />
          <span className="tabular-nums w-9 text-right">{brightness}%</span>
        </label>
        <label className="flex items-center gap-2 text-xs">
          <ContrastIcon className="h-4 w-4" />
          <input type="range" min={20} max={200} value={contrast} onChange={(e) => setContrast(Number(e.target.value))} />
          <span className="tabular-nums w-9 text-right">{contrast}%</span>
        </label>
      </footer>
    </div>
  );
}

function ToolBtn({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );
}
