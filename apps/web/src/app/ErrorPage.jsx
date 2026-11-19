import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ApiError } from '../shared/api/client.js';
import ErrorScreen from '../shared/ui/ErrorScreen.jsx';
import { useOnline } from '../shared/ui/OfflineBanner.jsx';

/** Qué pantalla de error corresponde a lo que falló. */
export function variantFor(error, online) {
  if (!online || (error instanceof ApiError && error.code === 'NETWORK_ERROR')) return 'offline';
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return 'notFound';
    if (error.status === 403) return 'forbidden';
  }
  return 'unexpected';
}

/**
 * Pantalla que muestra el router cuando algo falla al dibujar una página (`errorElement`). Va dentro
 * del marco de la sección, así que la barra o el menú siguen visibles. `actions` cambia los botones
 * (por ejemplo, en el portal del vendedor).
 */
export default function ErrorPage({ actions }) {
  const error = useRouteError();
  const online = useOnline();
  const variant = variantFor(error, online);
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  // Las acciones propias solo valen para el 404 de la sección; el resto usa las de siempre
  return (
    <ErrorScreen
      variant={variant}
      actions={variant === 'notFound' ? actions : undefined}
      detail={detail}
    />
  );
}

/** Respaldo para un error fuera de los marcos (sin barra ni menú): solo fondo y la pantalla. */
export function RootErrorPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <ErrorPage />
    </div>
  );
}
