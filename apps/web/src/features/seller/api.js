import { storeResponseSchema } from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/**
 * Actualiza el perfil del negocio del vendedor (PATCH /seller/store). Solo se envían los campos que
 * cambian; NIT, WhatsApp, ciudad, departamento y dirección no aceptan null.
 * @param {Record<string, unknown>} body
 */
export async function updateMyStore(body) {
  return storeResponseSchema.parse(await apiFetch('/seller/store', { method: 'PATCH', body }))
    .store;
}
