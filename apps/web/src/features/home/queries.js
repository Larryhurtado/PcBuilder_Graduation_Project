import { useQuery } from '@tanstack/react-query';
import { getFeaturedOffers } from './api.js';

export function useFeaturedOffers() {
  return useQuery({
    queryKey: ['offers', 'featured'],
    queryFn: ({ signal }) => getFeaturedOffers({ signal }),
  });
}
