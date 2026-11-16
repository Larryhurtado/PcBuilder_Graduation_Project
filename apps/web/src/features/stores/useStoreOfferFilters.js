import { componentCategories } from '@hw/contracts';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

export const OFFER_SORTS = [
  ['newest', 'Más recientes'],
  ['price_asc', 'Menor precio'],
  ['price_desc', 'Mayor precio'],
];

/** Filtros del catálogo de una tienda, guardados en la URL (`?category=`, `?q=`, `?sort=`). */
export function useStoreOfferFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => {
    const category = params.get('category');
    const sort = params.get('sort');
    return {
      category: componentCategories.includes(category) ? category : undefined,
      q: params.get('q')?.trim() || undefined,
      sort: OFFER_SORTS.some(([value]) => value === sort) ? sort : 'newest',
    };
  }, [params]);

  const update = useCallback(
    (patch, { replace = false } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, value] of Object.entries(patch)) {
            if (!value || (key === 'sort' && value === 'newest')) next.delete(key);
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
