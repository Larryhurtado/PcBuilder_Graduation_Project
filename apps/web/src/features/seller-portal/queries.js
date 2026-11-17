import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/api/client.js';
import { notify } from '../../shared/notices.js';
import {
  deleteSellerOffer,
  getAnalyticsSummary,
  getMyStore,
  getSellerOffers,
  getVerificationStatus,
  setSellerOfferStatus,
  updateSellerOffer,
} from './api.js';

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

/** Todas las ofertas del comercio (activas y pausadas). */
export function useSellerOffers(userId) {
  return useQuery({
    queryKey: ['seller', userId, 'offers'],
    queryFn: ({ signal }) => getSellerOffers({ signal }),
    enabled: Boolean(userId),
  });
}

/**
 * Acciones sobre el inventario. Pausar o activar se ve de inmediato y se revierte con un aviso si
 * falla; editar y eliminar esperan la respuesta y dejan el error a quien las llama (para mostrarlo
 * junto al campo). Todas actualizan el resumen del dashboard, que cuenta activas y pausadas.
 */
export function useOfferActions(userId) {
  const queryClient = useQueryClient();
  const key = ['seller', userId, 'offers'];
  const settle = () => {
    queryClient.invalidateQueries({ queryKey: key });
    queryClient.invalidateQueries({ queryKey: ['seller', userId, 'analytics'] });
  };

  const status = useMutation({
    mutationFn: ({ id, status: next }) => setSellerOfferStatus(id, next),
    onMutate: async ({ id, status: next }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (items) =>
        items?.map((item) => (item.offerId === id ? { ...item, status: next } : item)),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      notify({ tone: 'error', message: getErrorMessage(error) });
    },
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: ({ id, body }) => updateSellerOffer(id, body),
    onSuccess: (offer) =>
      queryClient.setQueryData(key, (items) =>
        items?.map((item) => (item.offerId === offer.offerId ? offer : item)),
      ),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id) => deleteSellerOffer(id),
    onSuccess: (_data, id) =>
      queryClient.setQueryData(key, (items) => items?.filter((item) => item.offerId !== id)),
    onSettled: settle,
  });

  return { status, update, remove };
}
