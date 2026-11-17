import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { deleteBuild, getBuild, saveBuild } from './api.js';

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
