// Fachada pública del módulo `builds` (regla M-1): lo único que otros módulos pueden importar.
// Operación (Diseño Integral, 4.7): getBuildByCode(code).
// Armados guardados con enlace compartible y clonado (HU-07, HU-13) y favoritos (HU-14).
// El PDF de la cotización se genera en el navegador (ADR-12).
import { createBuildsRepository } from './repository.js';
import { createBuildsRouter } from './routes.js';
import { createBuildsService } from './service.js';

/**
 * @param {{ db: { query: Function, transaction: Function }, compat: object, offers: object,
 *   catalog: object, auth: { requireAuth: Function, optionalAuth: Function },
 *   rateLimitOptions?: object, events?: { on: Function } }} deps
 *   `compat`, `offers` y `catalog` son las fachadas de esos módulos; `auth`, los middlewares de identity
 */
export function createBuildsModule({
  db,
  compat,
  offers,
  catalog,
  auth,
  rateLimitOptions,
  events,
}) {
  const repository = createBuildsRepository(db);
  const service = createBuildsService({ repository, compat, offers, catalog });
  // Cuenta eliminada: los favoritos se borran y los armados que ya se compartieron siguen
  // abiertos por su enlace, pero sin dueño (anónimos)
  events?.on('user.anonymized', ({ userId }) => repository.detachUser(userId));
  return {
    router: createBuildsRouter({ service, auth, rateLimitOptions }),
    facade: { getBuildByCode: service.getByShareCode },
  };
}
