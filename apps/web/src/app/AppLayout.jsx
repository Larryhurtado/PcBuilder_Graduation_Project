import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { bootstrapSession } from '../shared/session/actions.js';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

/** Estructura común de todas las pantallas: barra superior fija, contenido y pie. */
export default function AppLayout() {
  // Al cargar la app se intenta restaurar la sesión con la cookie de refresco
  useEffect(() => {
    bootstrapSession();
  }, []);

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
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
