import { offerListResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

export const PICKER_PAGE_SIZE = 20;

/**
 * HU-06: ofertas de una categoría que encajan con lo ya elegido. `constraints` sale de
 * `constraintsFor` del motor y son los mismos filtros técnicos de GET /offers. Las piezas con un
 * dato desconocido no se ocultan en el servidor. Se piden las especificaciones para evaluarlas.
 */
export async function getPickerOffers({ category, constraints, sort, condition, cursor, signal }) {
  const data = await apiFetch('/offers', {
    query: {
      category,
      ...constraints,
      sort,
      condition: condition || undefined,
      includeSpecs: true,
      limit: PICKER_PAGE_SIZE,
      cursor,
    },
    signal,
  });
  return offerListResponseSchema.parse(data);
}
