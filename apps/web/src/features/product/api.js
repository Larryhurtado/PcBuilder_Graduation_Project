import { componentSchema, offerListResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/** Ficha del componente con sus especificaciones (GET /components/{id}). */
export async function getComponent({ id, signal }) {
  return componentSchema.parse(await apiFetch(`/components/${id}`, { signal }));
}

/** Ofertas vigentes de un componente, de la más barata a la más cara (GET /offers?componentId). */
export async function getComponentOffers({ id, signal }) {
  const data = await apiFetch('/offers', {
    query: { componentId: id, sort: 'price_asc', limit: 50 },
    signal,
  });
  return offerListResponseSchema.parse(data);
}
