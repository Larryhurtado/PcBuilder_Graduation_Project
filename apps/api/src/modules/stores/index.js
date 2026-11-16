// Fachada pública del módulo `stores` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.2): getStoreByOwner(userId). La conversión a vendedor y el
// perfil se exponen por las rutas /seller/*.
import { createStoresRepository } from './repository.js';
import { createStoresRouter } from './routes.js';
import { createStoresService } from './service.js';

/**
 * @param {{ db: { query: Function }, identity: object, verification: object,
 *   auth: { requireAuth: Function, requireRole: Function } }} deps
 *   `identity` y `verification` son las fachadas de esos módulos; `auth` son sus middlewares.
 */
export function createStoresModule({ db, identity, verification, auth, rateLimitOptions }) {
  const service = createStoresService({
    repository: createStoresRepository(db),
    identity,
    verification,
  });
  return {
    router: createStoresRouter({ service, auth, rateLimitOptions }),
    facade: { getStoreByOwner: service.getStoreByOwner },
  };
}
