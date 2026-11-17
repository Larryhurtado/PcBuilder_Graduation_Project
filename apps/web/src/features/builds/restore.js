import { getComponent, getComponentOffers } from '../product/api.js';

/**
 * Reconstruye un armado guardado para el asistente. El asistente trabaja con ofertas completas
 * (con las especificaciones de la pieza), y el armado guardado solo trae ids, así que de cada pieza
 * se piden sus especificaciones y sus ofertas vigentes: se usa la oferta guardada y, si ya no está,
 * la más barata. Una pieza sin ninguna oferta no se puede cargar.
 * @param {{ category: string, componentId: string, offerId: string | null, displayName: string }[]} items
 * @returns {Promise<{ parts: Record<string, any>, unavailable: string[], replaced: number }>}
 */
export async function restoreBuild(items) {
  const restored = await Promise.all(
    items.map(async (item) => {
      try {
        const [component, { items: offers }] = await Promise.all([
          getComponent({ id: item.componentId }),
          getComponentOffers({ id: item.componentId }),
        ]);
        const saved = offers.find((offer) => offer.offerId === item.offerId);
        const offer = saved ?? offers[0];
        if (!offer) return { item, offer: null, replaced: false };
        return {
          item,
          offer: { ...offer, component: { ...offer.component, specs: component.specs } },
          replaced: !saved,
        };
      } catch {
        return { item, offer: null, replaced: false };
      }
    }),
  );

  return {
    parts: Object.fromEntries(
      restored.filter((entry) => entry.offer).map((entry) => [entry.item.category, entry.offer]),
    ),
    unavailable: restored.filter((entry) => !entry.offer).map((entry) => entry.item.displayName),
    replaced: restored.filter((entry) => entry.offer && entry.replaced).length,
  };
}

/** Aviso que acompaña al asistente al abrir un armado guardado. */
export function restoreNotice(name, { unavailable, replaced }) {
  const parts = [`Abrimos «${name}» en el asistente.`];
  if (replaced > 0) {
    parts.push(
      `${replaced} ${replaced === 1 ? 'pieza usa' : 'piezas usan'} la oferta más barata porque la guardada ya no está.`,
    );
  }
  if (unavailable.length > 0) {
    parts.push(
      `${unavailable.length} ${unavailable.length === 1 ? 'pieza no se cargó' : 'piezas no se cargaron'} por falta de ofertas: ${unavailable.join(', ')}.`,
    );
  }
  return parts.join(' ');
}
