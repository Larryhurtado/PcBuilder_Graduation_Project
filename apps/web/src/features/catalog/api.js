import { offerListResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';
import { toApiQuery } from './filters.js';

/** HU-09 y HU-10: una página de ofertas del catálogo con los filtros y el orden elegidos. */
export async function getCatalogPage({ filters, cursor, signal }) {
  const data = await apiFetch('/offers', { query: { ...toApiQuery(filters), cursor }, signal });
  return offerListResponseSchema.parse(data);
}
