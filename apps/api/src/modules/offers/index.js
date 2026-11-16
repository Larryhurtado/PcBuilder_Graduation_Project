// Fachada pública del módulo `offers` (regla M-1): lo único que otros módulos pueden importar.
// Hoy solo la lectura pública (Diseño Integral, 4.6). Pendientes: publicar, editar, pausar y dar
// de baja (HU-18 a 21), y pauseAllByStore(storeId).
import { createOffersRepository } from './repository.js';
import { createOffersRouter } from './routes.js';
import { createOffersService } from './service.js';

/**
 * @param {{ db: { query: Function }, catalog: { getSpecs: Function } }} deps
 *   `catalog` es la fachada del módulo catalog.
 */
export function createOffersModule({ db, catalog }) {
  const service = createOffersService({ repository: createOffersRepository(db), catalog });
  return {
    router: createOffersRouter({ service }),
    facade: {
      getOffer: service.getOffer,
      searchOffers: service.search,
    },
  };
}
