import { useQuery } from '@tanstack/react-query';
import { getPublicStores } from './api.js';

/** Comercios verificados; sirve al inicio, al directorio y a los filtros del catálogo. */
export function useStores({ limit = 12, q, city } = {}) {
  return useQuery({
    queryKey: ['stores', 'public', { limit, q, city }],
    queryFn: ({ signal }) => getPublicStores({ limit, q, city, signal }),
  });
}
