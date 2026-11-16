// Fachada pública del módulo `catalog` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.4): getComponent(id), getSpecs(ids), exists(id), search(text).
// La cascada del vendedor (marcas y modelos, HU-20) se expone solo por las rutas /catalog/brands y /catalog/models.
import { createCatalogRepository } from './repository.js';
import { createCatalogRouter } from './routes.js';
import { createCatalogService } from './service.js';

/** @param {{ db: { query: Function }, auth?: { requireAuth: Function, requireRole: Function } }} deps */
export function createCatalogModule({ db, auth }) {
  const service = createCatalogService({ repository: createCatalogRepository(db) });
  return {
    router: createCatalogRouter({ service, auth }),
    facade: {
      getComponent: service.getComponent,
      getSpecs: service.getSpecs,
      exists: service.exists,
      search: service.search,
    },
  };
}
