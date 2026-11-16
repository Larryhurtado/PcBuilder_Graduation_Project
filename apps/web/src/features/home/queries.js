import { useQuery } from '@tanstack/react-query';
import { getFeaturedOffers, getVerifiedStores } from './api.js';

export function useFeaturedOffers() {
  return useQuery({
    queryKey: ['offers', 'featured'],
    queryFn: ({ signal }) => getFeaturedOffers({ signal }),
  });
}

export function useVerifiedStores(limit = 3) {
  return useQuery({
    queryKey: ['stores', 'verified', limit],
    queryFn: ({ signal }) => getVerifiedStores({ limit, signal }),
  });
}
