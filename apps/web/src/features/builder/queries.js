import { useInfiniteQuery } from '@tanstack/react-query';
import { getPickerOffers } from './api.js';

/** Páginas de ofertas del selector; se piden más con `fetchNextPage` ("Cargar más"). */
export function usePickerOffers({ category, constraints, sort, condition }) {
  return useInfiniteQuery({
    queryKey: ['offers', 'picker', category, constraints, sort, condition],
    queryFn: ({ pageParam, signal }) =>
      getPickerOffers({ category, constraints, sort, condition, cursor: pageParam, signal }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(category),
  });
}
