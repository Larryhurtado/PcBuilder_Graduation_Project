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
 * Garantía de la oferta en meses: "Garantía 12 meses", "Garantía 1 mes" o "Sin garantía".
 * @param {number | null | undefined} months
 */
export function formatWarranty(months) {
  if (typeof months !== 'number' || !Number.isFinite(months) || months <= 0) return 'Sin garantía';
  return months === 1 ? 'Garantía 1 mes' : `Garantía ${months} meses`;
}
