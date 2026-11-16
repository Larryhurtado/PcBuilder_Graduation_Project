// Fachada pública del módulo `compat` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones (Diseño Integral, 4.5): validate(items) y constraints(category, items).
// La lógica de las reglas vive en el paquete @hw/compat-engine; aquí solo se cargan las
// especificaciones del catálogo y se expone por HTTP.
import { createCompatRouter } from './routes.js';
import { createCompatService } from './service.js';

/**
 * @param {{ catalog: { getSpecs: Function }, rateLimitOptions?: object }} deps
 *   `catalog` es la fachada del módulo catalog
 */
export function createCompatModule({ catalog, rateLimitOptions }) {
  const service = createCompatService({ catalog });
  return {
    router: createCompatRouter({ service, rateLimitOptions }),
    facade: { validate: service.validate, constraints: service.constraints },
  };
}
