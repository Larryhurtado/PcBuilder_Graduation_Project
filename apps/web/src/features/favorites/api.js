import { apiFetch } from '../../shared/api/client.js';

/** Agrega un componente a favoritos (PUT /me/wishlist/{id}); repetirlo no hace daño. */
export async function addFavorite(componentId) {
  await apiFetch(`/me/wishlist/${componentId}`, { method: 'PUT' });
}

/** Quita un componente de favoritos (DELETE /me/wishlist/{id}); repetirlo no hace daño. */
export async function removeFavorite(componentId) {
  await apiFetch(`/me/wishlist/${componentId}`, { method: 'DELETE' });
}
