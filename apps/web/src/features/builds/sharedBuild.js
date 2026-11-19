import { SHARE_CODE_PATTERN } from '@hw/contracts';
import { SLOTS } from '../builder/slots.js';

/** ¿El texto de la dirección tiene la forma de un código de armado (10 letras y números)? */
export const isShareCode = (code) => SHARE_CODE_PATTERN.test(code ?? '');

/**
 * Holgura de la tarjeta gráfica dentro del gabinete en milímetros (largo máximo que admite la caja
 * menos el largo de la tarjeta). Es null si falta alguna de las dos piezas o alguno de los datos.
 * @param {Record<string, any>} parts oferta elegida por categoría
 */
export function gpuClearance(parts) {
  const max = parts.case?.component.specs?.maxGpuLengthMm;
  const length = parts.gpu?.component.specs?.lengthMm;
  return Number.isFinite(max) && Number.isFinite(length) ? max - length : null;
}

/**
 * Las piezas guardadas en el orden de las ranuras del asistente, cada una con su oferta vigente (o
 * null) y si esa oferta ya no es la guardada.
 * @param {{ category: string, offerId: string | null }[]} items piezas del armado guardado
 * @param {Record<string, any>} parts ofertas vigentes por categoría
 */
export function sharedRows(items, parts) {
  return SLOTS.flatMap((slot) => {
    const item = items.find((entry) => entry.category === slot.category);
    if (!item) return [];
    const offer = parts[slot.category] ?? null;
    return [
      {
        slot,
        item,
        offer,
        // La oferta guardada ya no está: se muestra la más barata de hoy
        replaced: Boolean(offer) && item.offerId !== null && offer.offerId !== item.offerId,
      },
    ];
  });
}
