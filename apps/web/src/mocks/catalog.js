// Búsqueda de ofertas simulada: imita GET /offers de la API (apps/api/src/modules/offers/repository.js)
// con sus mismos filtros. Un dato desconocido (null) NO oculta la pieza: se mostrará como
// "no verificable". Es una función pura para poder usarla en el navegador, en las pruebas y en
// una API simulada local.
import { offers } from './data.js';

/** Normaliza para comparar: "LGA 1700" y "lga1700" son el mismo socket. */
const norm = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const listParam = (params, key) =>
  params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

const number = (params, key) => {
  const value = params.get(key);
  return value === null || value === '' ? undefined : Number(value);
};

/** Filtros técnicos por categoría (los mismos que devuelve constraintsFor del motor). */
function matchesTechnical(specs, category, params) {
  const anyOf = (value, wanted) => wanted.map(norm).includes(norm(value));
  const sockets = listParam(params, 'socket');
  const ramTypes = listParam(params, 'ram_type');
  const formFactors = listParam(params, 'form_factor');
  const coolerSockets = listParam(params, 'cooler_socket');
  const maxHeight = number(params, 'max_height_mm');
  const maxLength = number(params, 'max_length_mm');
  const supportsForm = params.get('supports_form_factor');
  const minGpuLength = number(params, 'min_gpu_length_mm');
  const minCoolerHeight = number(params, 'min_cooler_height_mm');
  const minWattage = number(params, 'min_wattage_w');

  if ((category === 'cpu' || category === 'motherboard') && sockets.length) {
    if (!anyOf(specs.socket, sockets)) return false;
  }
  if ((category === 'motherboard' || category === 'ram') && ramTypes.length) {
    if (!anyOf(specs.ramType, ramTypes)) return false;
  }
  if (category === 'motherboard' && formFactors.length) {
    if (!anyOf(specs.formFactor, formFactors)) return false;
  }
  if (category === 'cooler') {
    if (
      coolerSockets.length &&
      specs.sockets &&
      !specs.sockets.some((s) => anyOf(s, coolerSockets))
    )
      return false;
    if (maxHeight && specs.heightMm != null && specs.heightMm > maxHeight) return false;
  }
  if (category === 'gpu' && maxLength && specs.lengthMm != null && specs.lengthMm > maxLength) {
    return false;
  }
  if (category === 'case') {
    if (supportsForm && !specs.supportedMbFormFactors.map(norm).includes(norm(supportsForm)))
      return false;
    if (minGpuLength && specs.maxGpuLengthMm != null && specs.maxGpuLengthMm < minGpuLength)
      return false;
    if (
      minCoolerHeight &&
      specs.maxCoolerHeightMm != null &&
      specs.maxCoolerHeightMm < minCoolerHeight
    )
      return false;
  }
  if (category === 'psu' && minWattage && specs.wattageW < minWattage) return false;
  return true;
}

const sorters = {
  newest: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
  price_asc: (a, b) => a.priceCop - b.priceCop || a.offerId.localeCompare(b.offerId),
  price_desc: (a, b) => b.priceCop - a.priceCop || b.offerId.localeCompare(a.offerId),
};

const withoutSpecs = ({ component: { specs: _specs, ...component }, ...offer }) => ({
  ...offer,
  component,
});

/**
 * @param {URLSearchParams} params parámetros de consulta de GET /offers
 * @returns {{ items: object[], nextCursor: string | null }}
 */
export function searchOffers(params = new URLSearchParams()) {
  const category = params.get('category');
  const q = params.get('q')?.trim().toLowerCase();
  const minPrice = number(params, 'minPrice');
  const maxPrice = number(params, 'maxPrice');
  const condition = params.get('condition');
  const city = params.get('city')?.toLowerCase();
  const center = params.get('commercialCenter')?.toLowerCase();
  const storeId = params.get('storeId');
  const componentId = params.get('componentId');
  const sort = params.get('sort') in sorters ? params.get('sort') : 'newest';
  const limit = Math.min(Math.max(number(params, 'limit') ?? 20, 1), 50);
  const includeSpecs = params.get('includeSpecs') === 'true';
  const offset = params.get('cursor') ? JSON.parse(atob(params.get('cursor'))).offset : 0;

  const matches = offers
    .filter(({ component, store, ...offer }) => {
      if (category && component.category !== category) return false;
      if (componentId && component.id !== componentId) return false;
      if (
        q &&
        !`${component.displayName} ${component.model} ${component.brand}`.toLowerCase().includes(q)
      )
        return false;
      if (minPrice !== undefined && offer.priceCop < minPrice) return false;
      if (maxPrice !== undefined && offer.priceCop > maxPrice) return false;
      if (condition && offer.condition !== condition) return false;
      if (city && store.city?.toLowerCase() !== city) return false;
      if (center && store.commercialCenter?.toLowerCase() !== center) return false;
      if (storeId && store.id !== storeId) return false;
      return category ? matchesTechnical(component.specs, category, params) : true;
    })
    .sort(sorters[sort]);

  const page = matches.slice(offset, offset + limit);
  const next = offset + limit;
  return {
    items: includeSpecs ? page : page.map(withoutSpecs),
    nextCursor: next < matches.length ? btoa(JSON.stringify({ offset: next })) : null,
  };
}

/** GET /offers/featured: las más recientes, sin especificaciones (igual que la API). */
export function featuredOffers(limit = 8) {
  return { items: searchOffers(new URLSearchParams({ limit: String(limit) })).items };
}
