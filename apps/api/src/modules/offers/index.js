// Fachada pública del módulo `offers` (regla M-1): lo único que otros módulos pueden importar.
// Lectura pública (Diseño Integral, 4.6) y gestión del inventario del vendedor (HU-18 a 21).
// Pendiente: pauseAllByStore(storeId), para cuando exista la suspensión de comercios.
import { createOffersRepository } from './repository.js';
import { createOffersRouter } from './routes.js';
import { createSellerOffersRepository } from './seller-repository.js';
import { createSellerOffersRouter } from './seller-routes.js';
import { createSellerOffersService } from './seller-service.js';
import { createOffersService } from './service.js';

/**
 * @param {{ db: { query: Function, transaction: Function }, catalog: { getSpecs: Function, exists: Function },
 *   stores: { getStoreByOwner: Function }, storage: object,
 *   auth: { requireAuth: Function, requireRole: Function } }} deps
 *   `catalog` y `stores` son las fachadas de esos módulos; `auth`, los middlewares de identity.
 */
export function createOffersModule({ db, catalog, stores, storage, auth }) {
  const service = createOffersService({ repository: createOffersRepository(db), catalog });
  const sellerService = createSellerOffersService({
    repository: createSellerOffersRepository(db),
    catalog,
    stores,
    storage,
  });
  return {
    router: createOffersRouter({ service }),
    sellerRouter: createSellerOffersRouter({ service: sellerService, auth }),
    facade: {
      getOffer: service.getOffer,
      searchOffers: service.search,
      countByStatus: sellerService.countByStatus,
    },
  };
}
