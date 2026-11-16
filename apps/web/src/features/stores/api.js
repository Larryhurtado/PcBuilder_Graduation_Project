import { offerListResponseSchema, publicStoresResponseSchema } from '@hw/contracts';
import { ApiError, apiFetch } from '../../shared/api/client.js';

/** La API devuelve como máximo 50 comercios por consulta. */
export const STORES_LIMIT = 50;

/**
 * Comercios verificados (GET /stores). `q` y `city` son opcionales; la respuesta trae solo lo
 * público de cada tienda, con su cantidad de ofertas activas.
 */
export async function getPublicStores({ limit = 12, q, city, signal } = {}) {
  const data = await apiFetch('/stores', { query: { limit, q, city }, signal });
  return publicStoresResponseSchema.parse(data);
}

/**
 * Un comercio verificado por su id.
 *
 * TEMPORAL: la API todavía no tiene `GET /stores/{id}`, así que se busca en el listado público.
 * Cuando exista, solo hay que cambiar el cuerpo de esta función por
 * `publicStoreSchema.parse(await apiFetch(`/stores/${id}`, { signal }))`.
 * Si el comercio no está (o no está verificado) lanza el mismo 404 que daría el endpoint.
 */
export async function getPublicStore({ id, signal }) {
  const { items } = await getPublicStores({ limit: STORES_LIMIT, signal });
  const store = items.find((item) => item.id === id);
  if (!store) throw new ApiError({ status: 404, code: 'NOT_FOUND' });
  return store;
}

/** Una página de las ofertas de un comercio (GET /offers?storeId=…), con especificaciones. */
export async function getStoreOffersPage({ storeId, category, q, sort, cursor, signal }) {
  const data = await apiFetch('/offers', {
    query: { storeId, category, q, sort, cursor, limit: 12, includeSpecs: true },
    signal,
  });
  return offerListResponseSchema.parse(data);
}
