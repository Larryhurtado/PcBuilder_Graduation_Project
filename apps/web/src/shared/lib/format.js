/**
 * Agrupa los miles con punto, sin decimales (norma colombiana): 1849000 -> "1.849.000".
 * Devuelve null si el valor no es un número finito.
 * @param {unknown} value
 * @returns {string | null}
 */
export function formatCOPAmount(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  const sign = rounded < 0 ? '-' : '';
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Precio completo para mostrar en pantalla: "$ 1.849.000 COP".
 * Un valor inválido se muestra como "—" para no inventar precios.
 * @param {unknown} value pesos colombianos, entero
 */
export function formatCOP(value) {
  const amount = formatCOPAmount(value);
  return amount === null ? '—' : `$ ${amount} COP`;
}

/**
 * Ubicación legible de una tienda: "Cali, Valle del Cauca". Si el departamento ya nombra la
 * ciudad (Bogotá / Bogotá D.C.) no se repite.
 * @param {{ city?: string | null, department?: string | null }} place
 */
export function formatLocation({ city, department } = {}) {
  if (city && department) {
    return department.toLowerCase().startsWith(city.toLowerCase())
      ? department
      : `${city}, ${department}`;
  }
  return city || department || '';
}

/**
 * Iniciales para un avatar: las dos primeras palabras ("TecnoPasarela Cali" -> "TC").
 * @param {string | null | undefined} name
 */
export function initials(name) {
  return (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

/**
 * Teléfono colombiano legible a partir de E.164: "+573001234567" -> "+57 300 123 4567". Cualquier
 * otro formato se devuelve tal cual, y un valor vacío o inválido da null.
 * @param {string | null | undefined} e164
 */
export function formatPhone(e164) {
  if (typeof e164 !== 'string' || !/^\+[1-9]\d{7,14}$/.test(e164.trim())) return null;
  const phone = e164.trim();
  const match = phone.match(/^\+57(3\d{2})(\d{3})(\d{4})$/);
  return match ? `+57 ${match[1]} ${match[2]} ${match[3]}` : phone;
}

/**
 * Fecha larga en español ("12 de octubre de 2026"); devuelve null si no es una fecha válida.
 * @param {string | null | undefined} iso fecha ISO 8601
 */
export function formatDate(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * Garantía de la oferta en meses: "Garantía 12 meses", "Garantía 1 mes" o "Sin garantía".
 * @param {number | null | undefined} months
 */
export function formatWarranty(months) {
  if (typeof months !== 'number' || !Number.isFinite(months) || months <= 0) return 'Sin garantía';
  return months === 1 ? 'Garantía 1 mes' : `Garantía ${months} meses`;
}
