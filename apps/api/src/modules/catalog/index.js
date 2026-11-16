// Fachada pública del módulo `catalog` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.4): getComponent(id), getSpecs(ids), exists(id), search(text).
// Pendientes: listBrands(category) y listModels(category, brandId) (cascada del vendedor, HU-20).
import { createCatalogRepository } from './repository.js';
import { createCatalogRouter } from './routes.js';
import { createCatalogService } from './service.js';

/** @param {{ db: { query: Function } }} deps */
export function createCatalogModule({ db }) {
  const service = createCatalogService({ repository: createCatalogRepository(db) });
  return {
    router: createCatalogRouter({ service }),
    facade: {
      getComponent: service.getComponent,
      getSpecs: service.getSpecs,
      exists: service.exists,
      search: service.search,
    },
  };
}
