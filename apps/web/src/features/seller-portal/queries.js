import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getErrorMessage } from '../../shared/api/client.js';
import { notify } from '../../shared/notices.js';
import {
  createSellerOffer,
  deleteSellerOffer,
  getCatalogBrands,
  getCatalogModels,
  getAnalyticsSummary,
  getMyStore,
  getSellerOffers,
  getVerificationStatus,
  setSellerOfferStatus,
  updateSellerOffer,
  uploadOfferImage,
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

/** Marcas de una categoría para la cascada de publicación. */
export function useBrands(category) {
  return useQuery({
    queryKey: ['catalog', 'brands', category],
    queryFn: ({ signal }) => getCatalogBrands(category, { signal }),
    enabled: Boolean(category),
    staleTime: 300_000,
  });
}

/** Modelos de una marca en una categoría. */
export function useModels(category, brandId) {
  return useQuery({
    queryKey: ['catalog', 'models', category, brandId],
    queryFn: ({ signal }) => getCatalogModels(category, brandId, { signal }),
    enabled: Boolean(category && brandId),
    staleTime: 300_000,
  });
}

/**
 * Publica una oferta (o, con `original`, guarda los cambios de una publicada): sube las fotos
 * nuevas y luego crea o actualiza la oferta. Si algo falla a mitad de camino,
 * las fotos ya subidas conservan su clave (`photo.key`) para no repetirse al reintentar.
 * `onPhoto(id, patch)` informa el avance de cada foto.
 */
export function usePublishOffer(userId) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, photos, onPhoto, original }) => {
      const keys = [];
      for (const photo of photos) {
        let key = photo.key;
        if (!key) {
          onPhoto(photo.id, { status: 'uploading', error: null });
          try {
            key = await uploadOfferImage(photo.file);
          } catch (error) {
            onPhoto(photo.id, { status: 'error', error: getErrorMessage(error) });
            throw error;
          }
          onPhoto(photo.id, { status: 'done', key });
        }
        keys.push(key);
      }
      if (!original) return createSellerOffer({ ...body, imageKeys: keys });
      // Editar: solo se envía lo que cambió; sin cambios no se llama a la API
      const current = [...original.images]
        .sort((a, b) => a.position - b.position)
        .map((i) => i.key);
      const patch = { ...body };
      if (keys.length !== current.length || keys.some((key, index) => key !== current[index])) {
        patch.imageKeys = keys;
      }
      if (Object.keys(patch).length === 0) return original;
      return updateSellerOffer(original.offerId, patch);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['seller', userId, 'offers'] });
      client.invalidateQueries({ queryKey: ['seller', userId, 'analytics'] });
    },
  });
}
