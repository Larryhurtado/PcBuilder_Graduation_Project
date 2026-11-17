import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { create } from 'zustand';
import { getErrorMessage } from '../../shared/api/client.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import { useMyWishlist } from '../account/queries.js';
import { addFavorite, removeFavorite } from './api.js';

/** Componentes con un cambio en curso: evita que un doble clic mande dos peticiones. */
const usePending = create(() => ({ ids: new Set() }));

const markPending = (id, on) =>
  usePending.setState((state) => {
    const ids = new Set(state.ids);
    if (on) ids.add(id);
    else ids.delete(id);
    return { ids };
  });

const wishlistKey = (userId) => ['me', userId, 'wishlist'];

/**
 * Guarda o quita un favorito. El cambio se ve de inmediato en la lista en caché y se revierte si la
 * llamada falla; al terminar se pide la lista real. Quitar ofrece "Deshacer" y guardar ofrece ir a
 * la lista. No depende de ningún componente: el "Deshacer" funciona aunque la tarjeta ya no exista.
 * `component` necesita id, category, brand, model y displayName; minPriceCop y offersCount son
 * opcionales (para que la lista no espere a la respuesta del servidor).
 */
async function setFavorite(queryClient, userId, component, add) {
  if (usePending.getState().ids.has(component.id)) return;
  const key = wishlistKey(userId);
  markPending(component.id, true);
  await queryClient.cancelQueries({ queryKey: key });
  const previous = queryClient.getQueryData(key);
  if (previous) {
    queryClient.setQueryData(key, {
      items: add
        ? [
            {
              componentId: component.id,
              category: component.category,
              brand: component.brand,
              model: component.model,
              displayName: component.displayName,
              minPriceCop: component.minPriceCop ?? null,
              offersCount: component.offersCount ?? 0,
              addedAt: new Date().toISOString(),
            },
            ...previous.items.filter((item) => item.componentId !== component.id),
          ]
        : previous.items.filter((item) => item.componentId !== component.id),
    });
  }

  try {
    await (add ? addFavorite(component.id) : removeFavorite(component.id));
    notify(
      add
        ? {
            message: `${component.displayName} se guardó en tus favoritos.`,
            action: { label: 'Ver favoritos', to: '/cuenta/favoritos' },
          }
        : {
            message: `${component.displayName} se quitó de tus favoritos.`,
            action: {
              label: 'Deshacer',
              onClick: () => setFavorite(queryClient, userId, component, true),
            },
          },
    );
  } catch (error) {
    if (previous) queryClient.setQueryData(key, previous);
    notify({
      tone: 'error',
      message: `No pudimos actualizar tus favoritos. ${getErrorMessage(error)}`,
    });
  } finally {
    markPending(component.id, false);
    queryClient.invalidateQueries({ queryKey: key });
  }
}

/**
 * Favoritos de la cuenta para los corazones del sitio. Todos comparten la misma consulta
 * (GET /me/wishlist).
 */
export function useFavorites() {
  const { user, isLoading } = useSession();
  const queryClient = useQueryClient();
  const query = useMyWishlist(user?.id);
  const pending = usePending((state) => state.ids);

  const ids = useMemo(
    () => new Set((query.data?.items ?? []).map((item) => item.componentId)),
    [query.data],
  );

  return {
    user,
    isLoading,
    query,
    isFavorite: (componentId) => ids.has(componentId),
    isPending: (componentId) => pending.has(componentId),
    /** Guarda el componente si no es favorito y lo quita si ya lo es. */
    toggle: (component) => setFavorite(queryClient, user.id, component, !ids.has(component.id)),
    /** Quita varios favoritos (vaciar la lista); devuelve cuántos se quitaron. */
    async removeMany(components) {
      const key = wishlistKey(user.id);
      const results = await Promise.allSettled(components.map((c) => removeFavorite(c.id)));
      await queryClient.invalidateQueries({ queryKey: key });
      return results.filter((result) => result.status === 'fulfilled').length;
    },
  };
}
