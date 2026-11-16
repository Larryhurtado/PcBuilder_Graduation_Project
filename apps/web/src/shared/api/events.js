import { API_BASE } from '../config.js';

/**
 * Registra una vista o un clic a WhatsApp (POST /events). Se usa `sendBeacon` para que el
 * evento no se pierda cuando el navegador abre WhatsApp. Nunca interrumpe la acción del usuario.
 * @param {string} offerId
 * @param {'view' | 'whatsapp_click'} type
 */
export function trackOfferEvent(offerId, type) {
  try {
    const body = new Blob([JSON.stringify({ offerId, type })], { type: 'application/json' });
    navigator.sendBeacon?.(`${API_BASE}/events`, body);
  } catch {
    // Las métricas son secundarias: un fallo aquí no debe afectar el contacto con la tienda.
  }
}
