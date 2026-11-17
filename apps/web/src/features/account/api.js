import { buildListResponseSchema, wishlistResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/** Armados guardados de la cuenta (GET /me/builds). Requiere sesión. */
export async function getMyBuilds({ signal } = {}) {
  return buildListResponseSchema.parse(await apiFetch('/me/builds', { signal }));
}

/** Componentes favoritos de la cuenta (GET /me/wishlist). Requiere sesión. */
export async function getMyWishlist({ signal } = {}) {
  return wishlistResponseSchema.parse(await apiFetch('/me/wishlist', { signal }));
}
