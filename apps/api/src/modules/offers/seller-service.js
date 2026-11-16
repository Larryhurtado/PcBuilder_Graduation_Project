import { randomUUID } from 'node:crypto';
import { AppError } from '../../kernel/errors.js';

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAGIC = {
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/png': Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
};
const UPLOAD_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$/;
const iso = (value) => new Date(value).toISOString();

/** Dirección pública de una foto guardada. */
export const imageUrl = (key) => `/storage/${key}`;

function toSellerOffer(row) {
  return {
    offerId: row.offerId,
    status: row.status,
    priceCop: row.priceCop,
    condition: row.itemCondition,
    warrantyMonths: row.warrantyMonths,
    description: row.description ?? null,
    publishedAt: iso(row.publishedAt),
    updatedAt: iso(row.updatedAt),
    component: {
      id: row.componentId,
      category: row.category,
      brand: row.brand,
      model: row.model,
      displayName: row.displayName,
    },
    images: row.images.map((image) => ({
      key: image.key,
      url: imageUrl(image.key),
      position: image.position,
    })),
  };
}

/**
 * Casos de uso del vendedor sobre sus ofertas (HU-18 a HU-21).
 * @param {{
 *   repository: ReturnType<import('./seller-repository.js').createSellerOffersRepository>,
 *   catalog: { exists: (id: string) => Promise<boolean> },
 *   stores: { getStoreByOwner: (userId: string) => Promise<{ id: string, isVerified: boolean } | null> },
 *   storage: ReturnType<import('../../kernel/storage.js').createLocalStorage>,
 * }} deps `catalog` y `stores` son las fachadas públicas de esos módulos (regla M-1)
 */
export function createSellerOffersService({ repository, catalog, stores, storage }) {
  async function requireStore(userId, { verified }) {
    const store = await stores.getStoreByOwner(userId);
    if (!store)
      throw new AppError('NOT_FOUND', { message: 'Aún no tienes un negocio registrado.' });
    if (verified && !store.isVerified) throw new AppError('STORE_NOT_VERIFIED');
    return store;
  }

  const notFound = () => new AppError('NOT_FOUND', { message: 'No encontramos esa oferta.' });

  /** Las fotos deben ser de este comercio y estar ya subidas. */
  async function checkImageKeys(storeId, keys) {
    if (new Set(keys).size !== keys.length) {
      throw new AppError('VALIDATION_ERROR', { message: 'Hay fotos repetidas.' });
    }
    for (const key of keys) {
      const ownKey = key.startsWith(`offers/${storeId}/`) && UPLOAD_NAME.test(key.split('/').pop());
      if (!ownKey || !(await storage.exists(key))) {
        throw new AppError('VALIDATION_ERROR', {
          message: 'Una de las fotos no existe o no es tuya. Súbela de nuevo.',
          details: { imageKey: key },
        });
      }
    }
  }

  async function loadOwned(offerId, storeId) {
    const row = await repository.findOwned(offerId, storeId);
    if (!row) throw notFound();
    return toSellerOffer(row);
  }

  return {
    /** Paso 1 de la subida: el cliente recibe a dónde enviar el archivo y la clave que usará al publicar. */
    async presignImage(userId, { mimeType }) {
      const store = await requireStore(userId, { verified: true });
      const name = `${randomUUID()}.${EXTENSIONS[mimeType]}`;
      return {
        uploadUrl: `/api/v1/seller/offers/images/${name}`,
        storageKey: `offers/${store.id}/${name}`,
      };
    },

    /** Paso 2: guarda el archivo. Valida que el contenido sea de verdad JPG o PNG (no solo la cabecera HTTP). */
    async storeImage(userId, { name, mimeType, bytes }) {
      const store = await requireStore(userId, { verified: true });
      const magic = MAGIC[mimeType];
      const valid =
        UPLOAD_NAME.test(name) &&
        name.endsWith(`.${EXTENSIONS[mimeType]}`) &&
        Buffer.isBuffer(bytes) &&
        bytes.length > 0 &&
        magic &&
        bytes.subarray(0, magic.length).equals(magic);
      if (!valid) throw new AppError('FILE_REJECTED');
      await storage.put(`offers/${store.id}/${name}`, bytes);
    },

    async list(userId) {
      const store = await requireStore(userId, { verified: false });
      return (await repository.listByStore(store.id)).map(toSellerOffer);
    },

    async create(userId, body) {
      const store = await requireStore(userId, { verified: true });
      if (!(await catalog.exists(body.componentId))) throw new AppError('COMPONENT_NOT_FOUND');
      await checkImageKeys(store.id, body.imageKeys);
      const id = await repository.createWithImages({ storeId: store.id, ...body });
      return loadOwned(id, store.id);
    },

    async update(userId, offerId, patch) {
      const store = await requireStore(userId, { verified: true });
      if (patch.imageKeys) await checkImageKeys(store.id, patch.imageKeys);
      if (!(await repository.updateWithImages(offerId, store.id, patch))) throw notFound();
      return loadOwned(offerId, store.id);
    },

    /** Interruptor activo/pausado. Activar exige comercio verificado (también lo exige un disparador de la base). */
    async setVisibility(userId, offerId, status) {
      const store = await requireStore(userId, { verified: true });
      if (!(await repository.setStatus(offerId, store.id, status))) throw notFound();
      return loadOwned(offerId, store.id);
    },

    /** Baja lógica. No exige verificación: un comercio suspendido también puede retirar lo que tenía publicado. */
    async remove(userId, offerId) {
      const store = await requireStore(userId, { verified: false });
      if (!(await repository.softDelete(offerId, store.id))) throw notFound();
    },

    /** Conteo por estado, para el resumen del panel (lo usa el módulo analytics vía fachada). */
    countByStatus: (storeId) => repository.countByStatus(storeId),
  };
}
