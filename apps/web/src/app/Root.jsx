import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { bootstrapSession } from '../shared/session/actions.js';

/**
 * Raíz de todas las rutas: al cargar la app intenta restaurar la sesión con la cookie de refresco.
 * Va por encima de los dos marcos (el público y el del portal del vendedor) y de las guardas de
 * ruta, que esperan a que esto termine.
 */
export default function Root() {
  useEffect(() => {
    bootstrapSession();
  }, []);

  return <Outlet />;
}
