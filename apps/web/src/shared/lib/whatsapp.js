import { PLATFORM_NAME } from '../config.js';
import { formatCOPAmount } from './format.js';

/**
 * Mensaje prellenado (el usuario puede editarlo antes de enviar):
 * "Hola, vi tu publicación de {producto} a {precio} COP en {plataforma}. ¿Sigue disponible?"
 * @param {{ productName: string, priceCop: number, platformName?: string }} data
 */
export function buildWhatsAppMessage({ productName, priceCop, platformName = PLATFORM_NAME }) {
  const price = formatCOPAmount(priceCop);
  const priceText = price === null ? '' : ` a ${price} COP`;
  return `Hola, vi tu publicación de ${productName}${priceText} en ${platformName}. ¿Sigue disponible?`;
}

/**
 * Enlace https://wa.me/<número sin +>?text=<mensaje codificado>. No usa la API de WhatsApp.
 * Devuelve null si el número no es un E.164 válido, para que la interfaz deshabilite el botón.
 * @param {{ phoneE164: string | null | undefined, productName: string, priceCop: number, platformName?: string }} data
 * @returns {string | null}
 */
export function buildWhatsAppUrl({ phoneE164, ...message }) {
  if (typeof phoneE164 !== 'string' || !/^\+[1-9]\d{7,14}$/.test(phoneE164.trim())) return null;
  const digits = phoneE164.trim().slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppMessage(message))}`;
}
