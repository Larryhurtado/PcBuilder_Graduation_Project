import { useQuery } from '@tanstack/react-query';
import { getMyBuilds, getMyWishlist } from './api.js';

// La clave lleva el id del usuario: al cambiar de cuenta nunca se muestran datos de la anterior.

export function useMyBuilds(userId) {
  return useQuery({
    queryKey: ['me', userId, 'builds'],
    queryFn: ({ signal }) => getMyBuilds({ signal }),
    enabled: Boolean(userId),
  });
}

export function useMyWishlist(userId) {
  return useQuery({
    queryKey: ['me', userId, 'wishlist'],
    queryFn: ({ signal }) => getMyWishlist({ signal }),
    enabled: Boolean(userId),
  });
}
