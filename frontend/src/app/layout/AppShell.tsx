import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

// Rutas que ocupan exactamente el alto disponible (sin scroll de página): el
// contenido gestiona su propio layout interno (p. ej. el calendario).
const FULL_HEIGHT_PREFIXES = ['/calendario'];

export function AppShell() {
  const location = useLocation();
  // Clave a nivel de página (/, /pacientes, /pacientes/:id, /calendario…): la entrada
  // se reproduce al navegar entre páginas, pero NO al cambiar de pestaña dentro de una
  // ficha de paciente (mismo prefijo → sin remontar, sin perder estado).
  const pageKey = location.pathname.split('/').slice(0, 3).join('/');
  const isFullHeight = FULL_HEIGHT_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
  );

  const [mobileNav, setMobileNav] = useState(false);

  return (
    // h-full encadena 100% desde html/body/#root (definido en index.css). overflow-hidden
    // garantiza que NADA desborde el viewport: el scroll, si hace falta, vive dentro de <main>.
    <div className="flex h-full overflow-hidden">
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} />

        {/* main es un contenedor de alto definido (flex-1 + min-h-0). De él cuelgan dos
            modos: páginas con scroll propio, o páginas a pantalla completa que llenan el hueco. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {isFullHeight ? (
            <div key={pageKey} className="min-h-0 flex-1 motion-safe:animate-page-in">
              {/* Tope de ancho centrado (max-w-[100rem] ≈ 1600px, escala con la tipografía):
                  evita que el calendario se estire sin límite en monitores anchos/4K. */}
              <div className="mx-auto h-full w-full max-w-[100rem] px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
                <Outlet />
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              {/* El padding inferior vive en el hijo en flujo (pb-12), no en el contenedor con
                  scroll: los navegadores recortan el padding-bottom del contenedor al hacer scroll.
                  mx-auto + max-w centran el contenido y limitan el largo de línea en 4K. */}
              <div
                key={pageKey}
                className="mx-auto min-h-full w-full max-w-[100rem] px-4 pb-12 pt-6 motion-safe:animate-page-in sm:px-6 lg:px-8 lg:pt-8"
              >
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
