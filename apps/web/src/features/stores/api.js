import { publicStoresResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/**
 * Comercios verificados (GET /stores). `q` y `city` son opcionales; la respuesta trae solo lo
 * público de cada tienda, con su cantidad de ofertas activas.
 */
export async function getPublicStores({ limit = 12, q, city, signal } = {}) {
  const data = await apiFetch('/stores', { query: { limit, q, city }, signal });
  return publicStoresResponseSchema.parse(data);
}
