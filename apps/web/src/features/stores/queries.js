import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/client.js';
import { getPublicStore, getPublicStores, getStoreOffersPage } from './api.js';

/**
 * Comercios verificados; sirve al inicio, al directorio y a los filtros del catálogo. Al cambiar de
 * filtro conserva la lista anterior mientras llega la nueva (`isPlaceholderData`).
 */
export function useStores({ limit = 12, q, city } = {}) {
  return useQuery({
    queryKey: ['stores', 'public', { limit, q, city }],
    queryFn: ({ signal }) => getPublicStores({ limit, q, city, signal }),
    placeholderData: keepPreviousData,
  });
}

/** Un comercio por id. Un 404 no se reintenta: el resultado no va a cambiar. */
export function useStore(id) {
  return useQuery({
    queryKey: ['stores', 'public', 'one', id],
    queryFn: ({ signal }) => getPublicStore({ id, signal }),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 1,
  });
}

/** Ofertas del comercio, de a una página; `fetchNextPage` pide la siguiente. */
export function useStoreOffers(storeId, { category, q, sort }) {
  return useInfiniteQuery({
    queryKey: ['offers', 'store', storeId, { category, q, sort }],
    queryFn: ({ pageParam, signal }) =>
      getStoreOffersPage({ storeId, category, q, sort, cursor: pageParam, signal }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
