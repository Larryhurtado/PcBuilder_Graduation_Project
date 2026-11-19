import { imageMimeTypes, MAX_IMAGE_BYTES } from '@hw/contracts';
import { parsePrice } from './PriceCell.jsx';

export const MAX_PHOTOS = 5;

/** Los 4 pasos del asistente, en orden. */
export const STEPS = [
  { id: 'componente', label: 'Componente canónico' },
  { id: 'condiciones', label: 'Condiciones comerciales' },
  { id: 'fotos', label: 'Galería de fotos' },
  { id: 'resumen', label: 'Resumen y publicación' },
];

export const emptyDraft = {
  category: '',
  brandId: '',
  componentId: '',
  price: '',
  condition: 'new',
  warranty: '12',
  notes: '',
};

/** Porcentaje que muestra la barra: 0 en el primer paso y 100 en el último. */
export function progressPercent(stepIndex) {
  return Math.round((stepIndex / (STEPS.length - 1)) * 100);
}

/** Meses de garantía: entero entre 0 y 120, o null si el texto no sirve. */
export function parseWarranty(text) {
  const clean = String(text).trim();
  if (!/^\d+$/.test(clean)) return null;
  const value = Number(clean);
  return value <= 120 ? value : null;
}

/**
 * Errores de cada paso (objeto vacío = el paso está completo).
 * @param {number} step índice del paso
 * @param {typeof emptyDraft} draft
 */
export function stepErrors(step, draft) {
  const errors = {};
  if (step === 0) {
    if (!draft.category) errors.category = 'Elige la categoría del componente';
    else if (!draft.brandId) errors.brand = 'Elige la marca';
    else if (!draft.componentId) errors.model = 'Elige el modelo';
  }
  if (step === 1) {
    if (parsePrice(draft.price) === null) {
      errors.price = 'Escribe un precio entero mayor que 0, sin decimales';
    }
    if (parseWarranty(draft.warranty) === null) {
      errors.warranty = 'Escribe los meses de garantía, entre 0 y 120';
    }
    if (draft.notes.trim().length > 1000) errors.notes = 'Máximo 1000 caracteres';
  }
  return errors;
}

/** Borrador con los datos de una oferta publicada (para editarla). */
export function draftFromOffer(offer) {
  return {
    ...emptyDraft,
    componentId: offer.component.id,
    price: offer.priceCop.toLocaleString('es-CO'),
    condition: offer.condition,
    warranty: String(offer.warrantyMonths),
    notes: offer.description ?? '',
  };
}

/** Fotos ya guardadas de una oferta, en su orden (la primera es la portada). */
export function photosFromOffer(offer) {
  return [...offer.images]
    .sort((a, b) => a.position - b.position)
    .map((image, index) => ({
      id: `guardada-${image.key}`,
      file: { name: `Foto ${index + 1}`, size: null },
      previewUrl: image.url,
      key: image.key,
      status: 'saved',
      error: null,
      existing: true,
    }));
}

/** Solo lo que cambió respecto de la oferta publicada (PATCH pide al menos un campo). */
export function toEditBody(draft, offer) {
  const next = toOfferBody(draft);
  const body = {};
  if (next.priceCop !== offer.priceCop) body.priceCop = next.priceCop;
  if (next.warrantyMonths !== offer.warrantyMonths) body.warrantyMonths = next.warrantyMonths;
  if (next.description !== offer.description) body.description = next.description;
  return body;
}

/** Cuerpo de POST /seller/offers (sin las fotos, que se agregan al subirlas). */
export function toOfferBody(draft) {
  const notes = draft.notes.trim();
  return {
    componentId: draft.componentId,
    priceCop: parsePrice(draft.price),
    condition: draft.condition,
    warrantyMonths: parseWarranty(draft.warranty),
    description: notes === '' ? null : notes,
  };
}

/**
 * Referencia de mercado con las ofertas vigentes del mismo componente: menor, promedio y mayor
 * precio. Con menos de 2 ofertas no hay con qué comparar y devuelve null.
 * @param {{ priceCop: number }[]} offers
 */
export function priceReference(offers) {
  if (offers.length < 2) return null;
  const prices = offers.map((offer) => offer.priceCop);
  return {
    count: prices.length,
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
  };
}

/** Diferencia porcentual del precio contra el promedio, con un decimal (negativa = más barato). */
export function deltaVsAverage(price, average) {
  return Math.round(((price - average) / average) * 1000) / 10;
}

/** Motivo por el que una foto no sirve, o null si es válida (JPG o PNG de hasta 5 MB). */
export function photoProblem(file) {
  if (!imageMimeTypes.includes(file.type)) return 'Solo se aceptan fotos JPG o PNG';
  if (file.size > MAX_IMAGE_BYTES) return 'Cada foto puede pesar hasta 5 MB';
  if (file.size === 0) return 'El archivo está vacío';
  return null;
}

/** Tamaño legible de un archivo ("2,4 MB"). */
export function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-CO', { maximumFractionDigits: 1 })} MB`;
}
