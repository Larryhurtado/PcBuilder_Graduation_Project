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

/** Número sin el "+" si es un E.164 válido; null si no (la interfaz deshabilita el botón). */
function validDigits(phoneE164) {
  if (typeof phoneE164 !== 'string' || !/^\+[1-9]\d{7,14}$/.test(phoneE164.trim())) return null;
  return phoneE164.trim().slice(1);
}

/**
 * Enlace https://wa.me/<número sin +>?text=<mensaje codificado>. No usa la API de WhatsApp.
 * Devuelve null si el número no es un E.164 válido, para que la interfaz deshabilite el botón.
 * @param {{ phoneE164: string | null | undefined, productName: string, priceCop: number, platformName?: string }} data
 * @returns {string | null}
 */
export function buildWhatsAppUrl({ phoneE164, ...message }) {
  const digits = validDigits(phoneE164);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(buildWhatsAppMessage(message))}`;
}

/**
 * Enlace de consulta general a una tienda (sin un producto concreto):
 * "Hola, vi {tienda} en {plataforma}. Quisiera consultar por sus componentes."
 * @param {{ phoneE164: string | null | undefined, storeName: string, platformName?: string }} data
 * @returns {string | null}
 */
export function buildStoreWhatsAppUrl({ phoneE164, storeName, platformName = PLATFORM_NAME }) {
  const digits = validDigits(phoneE164);
  if (!digits) return null;
  const text = `Hola, vi ${storeName} en ${platformName}. Quisiera consultar por sus componentes.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
