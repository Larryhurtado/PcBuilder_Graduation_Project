import { saveBuild } from '../builds/api.js';

export const DEFAULT_NAME = 'Mi configuración';

/** Las piezas del armado como las espera POST /builds (el precio sale de la oferta elegida). */
export const toItems = (parts) =>
  Object.values(parts).map((offer) => ({
    category: offer.component.category,
    componentId: offer.component.id,
    offerId: offer.offerId,
  }));

/** Huella del armado: si no cambia, el enlace ya creado sigue sirviendo. */
const signatureOf = (parts) =>
  toItems(parts)
    .map((item) => `${item.category}:${item.componentId}:${item.offerId}`)
    .sort()
    .join('|');

// Último armado compartido desde el asistente. Se guarda la promesa para que dos clics seguidos
// no creen dos armados.
let cache = null;

/**
 * Devuelve el código del armado para compartirlo. Lo crea sin sesión (POST /builds, anónimo) y
 * reutiliza el mismo mientras las piezas no cambien. Un armado con incompatibilidades se guarda
 * como borrador, con el aviso, igual que en "Guardar".
 * @param {Record<string, any>} parts oferta elegida por categoría
 * @param {number} conflicts número de incompatibilidades del armado
 * @returns {Promise<string>} código para compartir
 */
export function shareCurrentBuild(parts, conflicts) {
  const signature = signatureOf(parts);
  if (!cache || cache.signature !== signature) {
    const promise = saveBuild({
      name: DEFAULT_NAME,
      items: toItems(parts),
      draft: conflicts > 0,
    }).then(({ build }) => build.shareCode);
    cache = { signature, promise };
    // Si falla, la siguiente vez se vuelve a intentar
    promise.catch(() => {
      if (cache?.promise === promise) cache = null;
    });
  }
  return cache.promise;
}

/** Olvida el último armado compartido (para pruebas). */
export function resetQuickShare() {
  cache = null;
}
