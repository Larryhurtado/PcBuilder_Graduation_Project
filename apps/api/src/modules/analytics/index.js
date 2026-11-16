// Fachada pública del módulo `analytics` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.8): record(event, context) y ensurePartitions().
// El resumen del panel del vendedor (HU-17) se expone por GET /seller/analytics/summary.
import { createAnalyticsRepository } from './repository.js';
import { createAnalyticsRouter } from './routes.js';
import { createAnalyticsService } from './service.js';
import { createSessionHasher } from './session-hash.js';

/**
 * @param {{
 *   db: { query: Function },
 *   offers: { getOffer: Function, countByStatus: Function },
 *   stores?: { getStoreByOwner: Function },
 *   auth?: { requireAuth: Function, requireRole: Function },
 *   secret?: string,
 *   rateLimitOptions?: { windowMs?: number, limit?: number },
 * }} deps `offers` y `stores` son las fachadas de esos módulos; `auth`, los middlewares de identity
 */
export function createAnalyticsModule({ db, offers, stores, auth, secret, rateLimitOptions }) {
  const service = createAnalyticsService({
    repository: createAnalyticsRepository(db),
    offers,
    stores,
    hashSession: createSessionHasher({ secret }),
  });
  return {
    router: createAnalyticsRouter({ service, auth, rateLimitOptions }),
    facade: { record: service.record, ensurePartitions: service.ensurePartitions },
  };
}
