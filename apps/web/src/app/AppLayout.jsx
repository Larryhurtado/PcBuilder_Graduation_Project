import { Outlet } from 'react-router';
import NoticeHost from '../shared/ui/NoticeHost.jsx';
import OfflineBanner from '../shared/ui/OfflineBanner.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

/**
 * Marco público: barra superior fija, contenido y pie. Se usa también para mostrar una pantalla
 * suelta (por ejemplo, la de cuenta equivocada) con la misma barra y el mismo pie.
 */
export function PublicFrame({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-space-md focus:top-space-md focus:z-[60] focus:rounded-xl focus:bg-primary-container focus:px-space-md focus:py-space-sm focus:text-on-primary-container"
      >
        Saltar al contenido
      </a>
      <Navbar />
      <main id="contenido" className="w-full flex-1 pt-16">
        <OfflineBanner />
        {children}
      </main>
      <Footer />
      <NoticeHost />
    </div>
  );
}

/** Estructura común de todas las pantallas públicas. */
export default function AppLayout() {
  return (
    <PublicFrame>
      <Outlet />
    </PublicFrame>
  );
}
