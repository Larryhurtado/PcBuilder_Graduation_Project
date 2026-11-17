import { savedBuildResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/** Guarda el armado (POST /builds). Con sesión queda en la cuenta; sin ella, solo con su enlace. */
export async function saveBuild(body) {
  return savedBuildResponseSchema.parse(await apiFetch('/builds', { method: 'POST', body }));
}

/** Un armado con su evaluación, por su código para compartir (GET /builds/{codigo}). */
export async function getBuild({ shareCode, signal }) {
  return savedBuildResponseSchema.parse(await apiFetch(`/builds/${shareCode}`, { signal }));
}

/** Elimina un armado de la cuenta (DELETE /me/builds/{id}); su enlace deja de funcionar. */
export async function deleteBuild(id) {
  await apiFetch(`/me/builds/${id}`, { method: 'DELETE' });
}
