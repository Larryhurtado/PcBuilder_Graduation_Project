import { componentCategories } from '@hw/contracts';
import { formatCOPAmount } from '../../shared/lib/format.js';
import { categoryLabels } from '../../shared/lib/specs.js';

/**
 * Filtros del catálogo. Viven en la URL (se pueden compartir y funcionan con "atrás") y usan los
 * mismos nombres que los parámetros de GET /offers. Un valor sin definir significa "sin filtro".
 */

export const PAGE_SIZE = 12;
export const DEFAULT_SORT = 'newest';

export const SORTS = [
  ['newest', 'Más reciente'],
  ['price_asc', 'Menor precio'],
  ['price_desc', 'Mayor precio'],
];

export const CONDITIONS = [
  ['new', 'Nuevo'],
  ['used', 'Usado'],
];

const sameOptions = (values) => values.map((value) => [value, value]);
const SOCKETS = sameOptions(['AM5', 'AM4', 'LGA 1700', 'LGA 1851']);

/**
 * Atributos técnicos que GET /offers sabe filtrar, por categoría. `multiple` permite varios valores
 * a la vez. Núcleos y TDP no están: la API todavía no los filtra.
 */
export const FACETS = {
  cpu: [{ key: 'socket', label: 'Socket de la placa base', multiple: true, options: SOCKETS }],
  motherboard: [
    { key: 'socket', label: 'Socket', multiple: true, options: SOCKETS },
    {
      key: 'ram_type',
      label: 'Tipo de memoria',
      multiple: true,
      options: sameOptions(['DDR5', 'DDR4']),
    },
    {
      key: 'form_factor',
      label: 'Formato',
      multiple: true,
      options: sameOptions(['ATX', 'Micro ATX', 'Mini-ITX', 'EATX']),
    },
  ],
  ram: [
    {
      key: 'ram_type',
      label: 'Tipo de memoria',
      multiple: true,
      options: sameOptions(['DDR5', 'DDR4']),
    },
  ],
  gpu: [
    {
      key: 'max_length_mm',
      label: 'Cabe en un gabinete de hasta',
      options: [
        ['250', '250 mm'],
        ['300', '300 mm'],
        ['330', '330 mm'],
        ['360', '360 mm'],
      ],
    },
  ],
  psu: [
    {
      key: 'min_wattage_w',
      label: 'Potencia mínima',
      options: [
        ['550', '550 W o más'],
        ['650', '650 W o más'],
        ['750', '750 W o más'],
        ['850', '850 W o más'],
      ],
    },
  ],
  case: [
    {
      key: 'supports_form_factor',
      label: 'Admite placas',
      options: sameOptions(['ATX', 'Micro ATX', 'Mini-ITX']),
    },
  ],
  cooler: [{ key: 'cooler_socket', label: 'Socket compatible', multiple: true, options: SOCKETS }],
  storage: [],
};

const TECHNICAL_KEYS = [
  'socket',
  'ram_type',
  'form_factor',
  'cooler_socket',
  'max_length_mm',
  'min_wattage_w',
  'supports_form_factor',
];
const LIST_KEYS = ['socket', 'ram_type', 'form_factor', 'cooler_socket'];

const facetFor = (category, key) => FACETS[category]?.find((facet) => facet.key === key);

const unique = (values) => [...new Set(values)];
const isMoney = (value) => /^\d{1,12}$/.test(value ?? '');

/** Deja solo los atributos técnicos que existen para la categoría elegida. */
function sanitize(filters) {
  const result = { ...filters };
  for (const key of TECHNICAL_KEYS) {
    const facet = filters.category ? facetFor(filters.category, key) : undefined;
    const allowed = facet?.options.map(([value]) => value) ?? [];
    if (LIST_KEYS.includes(key)) {
      // los atributos en lista son siempre una lista (vacía si no hay ninguno)
      result[key] = (filters[key] ?? []).filter((value) => allowed.includes(value));
    } else {
      result[key] = allowed.includes(filters[key]) ? filters[key] : undefined;
    }
  }
  if (isMoney(result.minPrice) && isMoney(result.maxPrice) && +result.minPrice > +result.maxPrice) {
    result.maxPrice = undefined; // la API rechaza un rango invertido
  }
  return result;
}

/** @param {URLSearchParams} params */
export function parseFilters(params) {
  const sort = params.get('sort');
  const condition = params.get('condition');
  const category = params.get('category');
  const filters = {
    q: params.get('q')?.trim().slice(0, 80) || undefined,
    category: componentCategories.includes(category) ? category : undefined,
    minPrice: isMoney(params.get('minPrice')) ? params.get('minPrice') : undefined,
    maxPrice: isMoney(params.get('maxPrice')) ? params.get('maxPrice') : undefined,
    condition: CONDITIONS.some(([value]) => value === condition) ? condition : undefined,
    city: params.get('city')?.trim() || undefined,
    sort: SORTS.some(([value]) => value === sort) ? sort : DEFAULT_SORT,
  };
  for (const key of TECHNICAL_KEYS) {
    if (LIST_KEYS.includes(key)) {
      filters[key] = unique(
        params
          .getAll(key)
          .flatMap((value) => value.split(','))
          .map((v) => v.trim())
          .filter(Boolean),
      );
    } else {
      filters[key] = params.get(key) || undefined;
    }
  }
  return sanitize(filters);
}

const SIMPLE_KEYS = ['q', 'category', 'minPrice', 'maxPrice', 'condition', 'city'];

/** Filtros → parámetros de la URL (sin los valores por defecto ni los vacíos). */
export function toSearchParams(filters) {
  const params = new URLSearchParams();
  for (const key of SIMPLE_KEYS) if (filters[key]) params.set(key, filters[key]);
  if (filters.sort && filters.sort !== DEFAULT_SORT) params.set('sort', filters.sort);
  for (const key of TECHNICAL_KEYS) {
    if (LIST_KEYS.includes(key)) for (const value of filters[key] ?? []) params.append(key, value);
    else if (filters[key]) params.set(key, filters[key]);
  }
  return params;
}

/** Aplica un cambio; si cambia la categoría se descartan los atributos técnicos de la anterior. */
export function applyPatch(filters, patch) {
  const next = { ...filters, ...patch };
  if ('category' in patch && patch.category !== filters.category) {
    for (const key of TECHNICAL_KEYS) next[key] = LIST_KEYS.includes(key) ? [] : undefined;
  }
  return sanitize(next);
}

/**
 * Quita todos los filtros. Conserva el orden y, salvo con `includeSearch`, también la búsqueda.
 * @param {{ includeSearch?: boolean }} [options]
 */
export function clearFilters(filters, { includeSearch = false } = {}) {
  return { q: includeSearch ? undefined : filters.q, sort: filters.sort };
}

/** Filtros → consulta de GET /offers: siempre con orden, especificaciones y tamaño de página. */
export function toApiQuery(filters) {
  const query = {
    category: filters.category,
    q: filters.q,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    condition: filters.condition,
    city: filters.city,
    sort: filters.sort,
    includeSpecs: true,
    limit: PAGE_SIZE,
  };
  for (const key of TECHNICAL_KEYS) {
    const value = filters[key];
    if (Array.isArray(value) ? value.length : value) query[key] = value;
  }
  return query;
}

/** Cantidad de filtros activos (sin contar la búsqueda ni el orden). */
export function countFilters(filters) {
  return activeChips(filters).length;
}

const money = (value) => `$ ${formatCOPAmount(Number(value))}`;

/**
 * Chips de filtros activos. `patch` es el cambio que quita ese filtro; `id` es estable.
 * @returns {{ id: string, label: string, patch: Record<string, unknown> }[]}
 */
export function activeChips(filters) {
  const chips = [];
  if (filters.category) {
    chips.push({
      id: 'category',
      label: `Categoría: ${categoryLabels[filters.category]}`,
      patch: { category: undefined },
    });
  }
  if (filters.city)
    chips.push({ id: 'city', label: `Ciudad: ${filters.city}`, patch: { city: undefined } });
  if (filters.condition) {
    const label = CONDITIONS.find(([value]) => value === filters.condition)[1];
    chips.push({ id: 'condition', label: `Condición: ${label}`, patch: { condition: undefined } });
  }
  if (filters.minPrice || filters.maxPrice) {
    const label =
      filters.minPrice && filters.maxPrice
        ? `${money(filters.minPrice)} – ${money(filters.maxPrice)}`
        : filters.minPrice
          ? `Desde ${money(filters.minPrice)}`
          : `Hasta ${money(filters.maxPrice)}`;
    chips.push({
      id: 'price',
      label: `Precio: ${label}`,
      patch: { minPrice: undefined, maxPrice: undefined },
    });
  }
  for (const facet of FACETS[filters.category] ?? []) {
    const values = LIST_KEYS.includes(facet.key)
      ? (filters[facet.key] ?? [])
      : [filters[facet.key]].filter(Boolean);
    for (const value of values) {
      const optionLabel = facet.options.find(([option]) => option === value)?.[1] ?? value;
      chips.push({
        id: `${facet.key}:${value}`,
        label: `${facet.label}: ${optionLabel}`,
        patch: {
          [facet.key]: LIST_KEYS.includes(facet.key)
            ? (filters[facet.key] ?? []).filter((item) => item !== value)
            : undefined,
        },
      });
    }
  }
  return chips;
}
