import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/client.js';
import { getComponent, getComponentOffers } from './api.js';

/** Un producto inexistente (404) no se reintenta: el resultado no va a cambiar. */
const retryUnlessNotFound = (count, error) =>
  !(error instanceof ApiError && error.status === 404) && count < 1;

export function useComponent(id) {
  return useQuery({
    queryKey: ['component', id],
    queryFn: ({ signal }) => getComponent({ id, signal }),
    retry: retryUnlessNotFound,
  });
}

export function useComponentOffers(id) {
  return useQuery({
    queryKey: ['offers', 'component', id],
    queryFn: ({ signal }) => getComponentOffers({ id, signal }),
  });
}
