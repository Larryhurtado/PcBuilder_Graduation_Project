import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { applyPatch, clearFilters, parseFilters, toSearchParams } from './filters.js';

/**
 * Filtros del catálogo guardados en la URL. `update` aplica un cambio parcial (`{ city: 'Cali' }`);
 * con `replace: true` no agrega una entrada al historial (útil mientras se escribe).
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch, { replace = false } = {}) =>
      setSearchParams((previous) => toSearchParams(applyPatch(parseFilters(previous), patch)), {
        replace,
      }),
    [setSearchParams],
  );

  // Se usa como `onClick={clear}`: solo `includeSearch === true` borra también la búsqueda.
  const clear = useCallback(
    (options) =>
      setSearchParams((previous) =>
        toSearchParams(
          clearFilters(parseFilters(previous), { includeSearch: options?.includeSearch === true }),
        ),
      ),
    [setSearchParams],
  );

  return { filters, update, clear };
}
