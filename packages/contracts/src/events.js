import { z } from 'zod';

export const eventTypeValues = ['view', 'whatsapp_click'];

/**
 * Cuerpo de POST /events: una vista de una oferta o un clic al WhatsApp de la tienda.
 * El frontend lo envía con `navigator.sendBeacon` (Blob `application/json`, o texto JSON).
 * Responde 204 sin cuerpo; los eventos repetidos en una ventana corta se descartan en silencio.
 */
export const eventBodySchema = z.strictObject({
  offerId: z.guid(),
  type: z.enum(eventTypeValues),
});
