import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary, getMyStore, getVerificationStatus } from './api.js';

// Las claves llevan el id del usuario: al cambiar de cuenta nunca se ven datos de la anterior.

export function useMyStore(userId) {
  return useQuery({
    queryKey: ['seller', userId, 'store'],
    queryFn: ({ signal }) => getMyStore({ signal }),
    enabled: Boolean(userId),
  });
}

export function useVerificationStatus(userId) {
  return useQuery({
    queryKey: ['seller', userId, 'verification'],
    queryFn: ({ signal }) => getVerificationStatus({ signal }),
    enabled: Boolean(userId),
  });
}

/** Resumen de un rango. Al cambiar de rango conserva el anterior mientras llega el nuevo. */
export function useAnalytics(userId, range) {
  return useQuery({
    queryKey: ['seller', userId, 'analytics', range.from, range.to],
    queryFn: ({ signal }) => getAnalyticsSummary({ ...range, signal }),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
