import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../shared/api/client.js';
import { cloneBuild, deleteBuild, getBuild, saveBuild } from './api.js';
import { restoreBuild } from './restore.js';

/** Guardar un armado; al terminar se actualiza la lista de la cuenta. */
export function useSaveBuild(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBuild,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', userId, 'builds'] }),
  });
}

/** Eliminar un armado; al terminar se actualiza la lista de la cuenta. */
export function useDeleteBuild(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBuild,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', userId, 'builds'] }),
  });
}

/**
 * Detalle (piezas y evaluación) de cada armado de la lista. La lista solo trae resúmenes, así que
 * se pide uno por armado. Devuelve las consultas en el mismo orden que `builds`.
 */
export function useBuildDetails(builds) {
  return useQueries({
    queries: builds.map((build) => ({
      queryKey: ['build', build.shareCode, build.updatedAt],
      queryFn: ({ signal }) => getBuild({ shareCode: build.shareCode, signal }),
    })),
  });
}

/** Un código inexistente o mal escrito (404 o 422) no se reintenta: el resultado no va a cambiar. */
const retryUnlessMissing = (count, error) =>
  !(error instanceof ApiError && [404, 422].includes(error.status)) && count < 1;

/**
 * Armado compartido y su evaluación actual (GET /builds/{codigo}), abierto por su código. La clave
 * lleva el id del usuario porque la respuesta dice si el armado es suyo (`isOwner`).
 */
export function useSharedBuild(shareCode, userId, enabled = true) {
  return useQuery({
    queryKey: ['shared-build', shareCode, userId ?? null],
    queryFn: ({ signal }) => getBuild({ shareCode, signal }),
    enabled,
    retry: retryUnlessMissing,
  });
}

/** Piezas del armado con su oferta vigente y especificaciones (la misma carga que "Abrir en el asistente"). */
export function useSharedParts(build) {
  return useQuery({
    queryKey: ['shared-parts', build?.shareCode, build?.updatedAt],
    queryFn: () => restoreBuild(build.items),
    enabled: Boolean(build),
  });
}

/** Guardar una copia de un armado compartido en la cuenta; al terminar se actualiza la lista. */
export function useCloneBuild(userId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cloneBuild,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me', userId, 'builds'] }),
  });
}
