import { AppError } from '../../kernel/errors.js';
import { decodeCursor, encodeCursor } from './cursor.js';

/** Dirección pública de una foto. Mientras no existan fotos reales, la imagen de relleno la pone el frontend. */
const imageUrl = (key) => (key ? `/storage/${key}` : null);

function toStore(row) {
  return {
    id: row.storeId,
    name: row.storeName,
    city: row.city ?? null,
    department: row.department ?? null,
    commercialCenter: row.commercialCenter ?? null,
    whatsappE164: row.whatsappE164 ?? null,
  };
}

function toListItem(row, componentsById) {
  const component = {
    id: row.componentId,
    category: row.category,
    brand: row.brand,
    model: row.model,
    displayName: row.displayName,
  };
  if (componentsById) component.specs = componentsById.get(row.componentId)?.specs ?? {};
  return {
    offerId: row.offerId,
    priceCop: row.priceCop,
    condition: row.itemCondition,
    warrantyMonths: row.warrantyMonths,
    publishedAt: new Date(row.publishedAt).toISOString(),
    coverImageUrl: imageUrl(row.coverImageKey),
    component,
    store: toStore(row),
  };
}

/**
 * @param {{
 *   repository: ReturnType<import('./repository.js').createOffersRepository>,
 *   catalog: { getSpecs: (ids: string[]) => Promise<Map<string, any>> },
 * }} deps `catalog` es la fachada pública del módulo catalog (regla M-1)
 */
export function createOffersService({ repository, catalog }) {
  return {
    /** Listado público con filtros, orden y paginación por cursor. */
    async search(query) {
      const { sort, limit, cursor: cursorText, includeSpecs, ...filters } = query;
      const cursor = cursorText ? decodeCursor(cursorText, sort) : null;

      const rows = await repository.search({ filters, sort, limit: limit + 1, cursor });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      const components = includeSpecs
        ? await catalog.getSpecs([...new Set(page.map((row) => row.componentId))])
        : null;
      return {
        items: page.map((row) => toListItem(row, components)),
        nextCursor: hasMore ? encodeCursor(sort, page[page.length - 1]) : null,
      };
    },

    /** Las ofertas más recientes (inicio, HU-02). */
    async featured(limit = 8) {
      const rows = await repository.search({ filters: {}, sort: 'newest', limit });
      return { items: rows.map((row) => toListItem(row, null)) };
    },

    /** Detalle de una oferta pública. Las pausadas, eliminadas o de comercios sin verificar no existen. */
    async getOffer(id) {
      const row = await repository.findPublicById(id);
      if (!row) throw new AppError('NOT_FOUND', { message: 'La oferta no está disponible.' });
      const images = await repository.findImages(id);
      const { component, store, ...base } = toListItem(row, null);
      return {
        ...base,
        description: row.description ?? null,
        images: images.map((image) => ({
          url: imageUrl(image.storageKey),
          position: image.position,
          altText: image.altText ?? null,
        })),
        component,
        store: {
          ...store,
          address: row.address ?? null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
        },
      };
    },
  };
}
