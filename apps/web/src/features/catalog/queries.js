import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { getCatalogPage } from './api.js';
import { toApiQuery } from './filters.js';

/**
 * Ofertas del catálogo, de a una página; `fetchNextPage` pide la siguiente ("Cargar más").
 * Mientras llegan los resultados de un filtro nuevo se conservan los anteriores (`isPlaceholderData`).
 */
export function useCatalogOffers(filters) {
  return useInfiniteQuery({
    queryKey: ['offers', 'catalog', toApiQuery(filters)],
    queryFn: ({ pageParam, signal }) => getCatalogPage({ filters, cursor: pageParam, signal }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
