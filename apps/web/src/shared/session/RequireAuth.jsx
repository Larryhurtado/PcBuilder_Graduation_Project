import { errorCodes } from '@hw/contracts';
import { Navigate, Outlet, useLocation } from 'react-router';
import ButtonLink from '../ui/ButtonLink.jsx';
import Container from '../ui/Container.jsx';
import { useSession } from './useSession.js';

/**
 * Guarda de ruta: sin sesión manda a /ingresar (con `?next=` para volver) y, si se indican `roles`,
 * muestra un aviso a quien no tenga ninguno. Mientras se restaura la sesión espera sin parpadear.
 * @param {{ roles?: ('buyer' | 'seller' | 'admin')[] }} props
 */
export default function RequireAuth({ roles }) {
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
    return (
      <Container className="flex min-h-[50vh] flex-col items-start justify-center gap-space-md py-space-2xl">
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Esta sección no es para tu tipo de cuenta
        </h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          {errorCodes.ROLE_FORBIDDEN.message}
        </p>
        <ButtonLink to="/" variant="primary">
          Ir al inicio
        </ButtonLink>
      </Container>
    );
  }

  return <Outlet />;
}
