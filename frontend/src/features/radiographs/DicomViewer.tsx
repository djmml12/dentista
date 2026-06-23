import { useEffect, useRef, useState } from 'react';
import { X, RefreshCcw } from 'lucide-react';
import * as cornerstone from '@cornerstonejs/core';
import { Enums, RenderingEngine } from '@cornerstonejs/core';
import { initCornerstone } from './cornerstoneInit';

interface Props {
  url: string;
  fileName: string;
  onClose: () => void;
}

const RENDERING_ID = 'dental-rendering-engine';
const VIEWPORT_ID = 'dental-dicom-viewport';

export function DicomViewer({ url, fileName, onClose }: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<RenderingEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await initCornerstone();
        if (cancelled || !elementRef.current) return;

        const blob = await fetch(url).then((r) => r.blob());
        const objectUrl = URL.createObjectURL(blob);
        const imageId = `wadouri:${objectUrl}`;

        const engine = new RenderingEngine(RENDERING_ID);
        engineRef.current = engine;

        engine.enableElement({
          viewportId: VIEWPORT_ID,
          type: Enums.ViewportType.STACK,
          element: elementRef.current as HTMLDivElement,
        });

        const viewport = engine.getViewport(VIEWPORT_ID) as cornerstone.Types.IStackViewport;
        await viewport.setStack([imageId]);
        viewport.render();
        setLoading(false);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError('No se pudo cargar el DICOM. Verifica que sea un archivo válido.');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      try {
        engineRef.current?.destroy();
      } catch {
        /* noop */
      }
      engineRef.current = null;
    };
  }, [url]);

  function reset() {
    const engine = engineRef.current;
    if (!engine) return;
    const viewport = engine.getViewport(VIEWPORT_ID) as cornerstone.Types.IStackViewport;
    viewport.resetCamera();
    viewport.resetProperties();
    viewport.render();
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/95 flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 text-white">
        <span className="text-sm truncate">{fileName}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label="Reiniciar"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>
      <div className="flex-1 relative">
        <div ref={elementRef} className="absolute inset-0 [&_canvas]:!w-full [&_canvas]:!h-full" />
        {loading && (
          <div className="absolute inset-0 grid place-items-center text-white text-sm">
            Cargando DICOM...
          </div>
        )}
        {error && (
          <div className="absolute inset-0 grid place-items-center text-white text-sm">{error}</div>
        )}
      </div>
      <footer className="px-4 py-3 bg-neutral-900/95 text-white text-xs text-center">
        Click + arrastrar: ventana/nivel · Rueda: zoom · Click derecho: pan
      </footer>
    </div>
  );
}
