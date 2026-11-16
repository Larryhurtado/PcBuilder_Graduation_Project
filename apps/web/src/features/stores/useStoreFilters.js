import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export const STORE_SORTS = [
  ['offers', 'Más ofertas'],
  ['name', 'Nombre (A–Z)'],
];

/** La API pide al menos 2 caracteres para buscar por texto. */
export const MIN_SEARCH_LENGTH = 2;

/** Filtros del directorio, guardados en la URL (`?q=`, `?city=`, `?sort=`) para poder compartirlos. */
export function useStoreFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const sort = params.get('sort');
    return {
      q: params.get('q')?.trim() || undefined,
      city: params.get('city')?.trim() || undefined,
      sort: STORE_SORTS.some(([value]) => value === sort) ? sort : 'offers',
    };
  }, [params]);

  const update = useCallback(
    (patch, { replace = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (!value || (key === 'sort' && value === 'offers')) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace },
      );
    },
    [setParams],
  );

  const clear = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  return { filters, update, clear };
}
