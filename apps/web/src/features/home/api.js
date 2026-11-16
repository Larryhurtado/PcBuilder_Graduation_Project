import { apiFetch } from '../../shared/api/client.js';
import { featuredOffersSchema, storesPageSchema } from '../../shared/api/schemas.js';

/** HU-02: ofertas recientes de comercios verificados (GET /offers/featured). */
export async function getFeaturedOffers({ signal } = {}) {
  return featuredOffersSchema.parse(await apiFetch('/offers/featured', { signal }));
}

/** Comercios verificados para el inicio (GET /stores). */
export async function getVerifiedStores({ limit = 3, signal } = {}) {
  return storesPageSchema.parse(await apiFetch('/stores', { query: { limit }, signal }));
}
