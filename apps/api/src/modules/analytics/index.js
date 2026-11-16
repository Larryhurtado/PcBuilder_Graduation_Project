// Fachada pública del módulo `analytics` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.8): record(event, context) y ensurePartitions().
// Pendiente: GET /seller/analytics/summary para el panel del vendedor (HU-17).
import { createAnalyticsRepository } from './repository.js';
import { createAnalyticsRouter } from './routes.js';
import { createAnalyticsService } from './service.js';
import { createSessionHasher } from './session-hash.js';

/**
 * @param {{
 *   db: { query: Function },
 *   offers: { getOffer: Function },
 *   secret?: string,
 *   rateLimitOptions?: { windowMs?: number, limit?: number },
 * }} deps `offers` es la fachada del módulo offers
 */
export function createAnalyticsModule({ db, offers, secret, rateLimitOptions }) {
  const service = createAnalyticsService({
    repository: createAnalyticsRepository(db),
    offers,
    hashSession: createSessionHasher({ secret }),
  });
  return {
    router: createAnalyticsRouter({ service, rateLimitOptions }),
    facade: { record: service.record, ensurePartitions: service.ensurePartitions },
  };
}
