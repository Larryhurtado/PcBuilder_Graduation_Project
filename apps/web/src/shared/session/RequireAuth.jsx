import { Navigate, Outlet, useLocation } from 'react-router';
import ErrorScreen from '../ui/ErrorScreen.jsx';
import { useSession } from './useSession.js';

/**
 * Guarda de ruta: sin sesión manda a /ingresar (con `?next=` para volver) y, si se indican `roles`,
 * muestra un aviso a quien no tenga ninguno. Mientras se restaura la sesión espera sin parpadear.
 * `frame` es el marco (con barra y pie) en el que se muestra la pantalla de cuenta equivocada cuando
 * la guarda está fuera de los marcos de la app.
 * @param {{ roles?: ('buyer' | 'seller' | 'admin')[], frame?: import('react').ComponentType<{ children: import('react').ReactNode }> }} props
 */
export default function RequireAuth({ roles, frame: Frame }) {
  const { user, isLoading } = useSession();
  const location = useLocation();

  if (isLoading) {
    return <div role="status" aria-label="Verificando sesión" className="min-h-[50vh]" />;
  }

  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/ingresar?next=${next}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const screen = <ErrorScreen variant="forbidden" />;
    return Frame ? <Frame>{screen}</Frame> : screen;
  }

  return <Outlet />;
}
