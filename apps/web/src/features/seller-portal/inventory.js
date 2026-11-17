export const PAGE_SIZE = 10;

// Quita tildes y diéresis para que "memoria" encuentre "Memória" y "grafica" encuentre "gráfica"
const norm = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/**
 * Filtra las ofertas del vendedor por texto (nombre, marca o modelo, sin importar tildes ni
 * mayúsculas), estado y categoría. Quien filtra recibe el resultado en el orden en que llegó.
 * @param {any[]} offers
 * @param {{ q?: string, status?: 'active' | 'paused' | '', category?: string }} filters
 */
export function filterOffers(offers, { q = '', status = '', category = '' } = {}) {
  const needle = norm(q.trim());
  return offers.filter((offer) => {
    if (status && offer.status !== status) return false;
    if (category && offer.component.category !== category) return false;
    if (!needle) return true;
    const { displayName, brand, model } = offer.component;
    return norm(`${displayName} ${brand} ${model}`).includes(needle);
  });
}

/** Cifras del inventario: cuántas activas y pausadas, y el precio promedio y el rango de las activas. */
export function summarize(offers) {
  const active = offers.filter((offer) => offer.status === 'active');
  const prices = active.map((offer) => offer.priceCop);
  return {
    active: active.length,
    paused: offers.length - active.length,
    averagePrice: prices.length
      ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length)
      : null,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

/**
 * Páginas que muestra el paginador: siempre la primera y la última, la actual con una vecina a cada
 * lado y "…" donde se saltan páginas. Con pocas páginas las muestra todas.
 * @returns {(number | '…')[]}
 */
export function pageWindow(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push('…');
    result.push(page);
  });
  return result;
}
