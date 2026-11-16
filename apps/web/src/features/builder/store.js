import { componentCategories, offerListItemSchema } from '@hw/contracts';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Una oferta sirve para el armador solo si trae las especificaciones de su componente. */
const isUsableOffer = (offer, category) =>
  offerListItemSchema.safeParse(offer).success &&
  offer.component.category === category &&
  offer.component.specs != null;

/** Descarta lo guardado que ya no cumpla el contrato (por ejemplo, tras un cambio de versión). */
function sanitizeParts(parts) {
  if (!parts || typeof parts !== 'object') return {};
  return Object.fromEntries(
    componentCategories
      .filter((category) => isUsableOffer(parts[category], category))
      .map((category) => [category, parts[category]]),
  );
}

/**
 * Armado en curso: una oferta por categoría (con las especificaciones de su componente, que es lo
 * que evalúa el motor). Se guarda en sessionStorage para no perderlo al recargar.
 */
export const useBuildStore = create(
  persist(
    (set) => ({
      parts: {},

      /** Pone o reemplaza la pieza de su categoría. Ignora ofertas sin especificaciones. */
      setPart: (offer) =>
        set((state) =>
          isUsableOffer(offer, offer?.component?.category)
            ? { parts: { ...state.parts, [offer.component.category]: offer } }
            : state,
        ),

      removePart: (category) =>
        set((state) => {
          const { [category]: _removed, ...parts } = state.parts;
          return { parts };
        }),

      reset: () => set({ parts: {} }),
    }),
    {
      name: 'pcbuilder-armado',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ parts: state.parts }),
      merge: (persisted, current) => ({ ...current, parts: sanitizeParts(persisted?.parts) }),
    },
  ),
);
