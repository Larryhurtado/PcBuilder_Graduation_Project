import { offerListResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/**
 * HU-02: las ofertas más recientes de comercios verificados. Se piden a GET /offers con
 * `includeSpecs` para que las tarjetas muestren los datos técnicos (GET /offers/featured no los trae).
 */
export async function getFeaturedOffers({ limit = 4, signal } = {}) {
  const data = await apiFetch('/offers', {
    query: { sort: 'newest', limit, includeSpecs: true },
    signal,
  });
  return offerListResponseSchema.parse(data);
}
