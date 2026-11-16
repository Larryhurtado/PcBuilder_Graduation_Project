import { randomInt } from 'node:crypto';
import { AppError } from '../../kernel/errors.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const MAX_CODE_ATTEMPTS = 5;
const iso = (value) => new Date(value).toISOString();

/** Código público de 10 letras y números (enlace compartible, HU-07). */
export function newShareCode() {
  return Array.from({ length: 10 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
}

/**
 * Armados guardados, enlace compartible y favoritos (HU-07, HU-13, HU-14).
 * @param {{
 *   repository: ReturnType<import('./repository.js').createBuildsRepository>,
 *   compat: { validate: (items: object[]) => Promise<any> },
 *   offers: { getOffer: (id: string) => Promise<any> },
 *   catalog: { exists: (id: string) => Promise<boolean> },
 *   newCode?: () => string,
 * }} deps `compat`, `offers` y `catalog` son las fachadas públicas de esos módulos (regla M-1)
 */
export function createBuildsService({
  repository,
  compat,
  offers,
  catalog,
  newCode = newShareCode,
}) {
  const notFound = () => new AppError('NOT_FOUND', { message: 'No encontramos ese armado.' });

  /**
   * Valida otra vez con el motor (la validación de autoridad es la del servidor) y fija el precio
   * unitario de cada pieza con la oferta elegida.
   */
  async function prepare(items, { draft }) {
    const evaluation = await compat.validate(
      items.map(({ category, componentId }) => ({ category, componentId })),
    );
    if (evaluation.summary.incompatible > 0 && !draft) {
      throw new AppError('BUILD_INCOMPATIBLE', {
        details: {
          incompatible: evaluation.results
            .filter((r) => r.status === 'fail')
            .map(({ code, message }) => ({ code, message })),
        },
      });
    }
    const prepared = [];
    for (const item of items) {
      let unitPriceCop = null;
      if (item.offerId) {
        const offer = await offers.getOffer(item.offerId); // 404 si no es pública
        if (offer.component.id !== item.componentId) {
          throw new AppError('VALIDATION_ERROR', {
            message: 'La oferta elegida no es de ese componente.',
            details: { offerId: item.offerId, componentId: item.componentId },
          });
        }
        unitPriceCop = offer.priceCop;
      }
      prepared.push({
        category: item.category,
        componentId: item.componentId,
        offerId: item.offerId ?? null,
        unitPriceCop,
      });
    }
    return { evaluation, items: prepared, estimatedWatts: evaluation.estimatedWatts };
  }

  /** Inserta con un código nuevo; si justo coincide con otro (muy improbable) reintenta. */
  async function createWithCode(data) {
    for (let attempt = 1; ; attempt++) {
      const shareCode = newCode();
      try {
        return await repository.create({ ...data, shareCode });
      } catch (error) {
        const duplicated = error instanceof AppError && error.status === 409;
        if (!duplicated || attempt >= MAX_CODE_ATTEMPTS) throw error;
      }
    }
  }

  /** Armado con los nombres de las piezas y la evaluación actual del motor. */
  async function present(row, viewerId) {
    const stored = await repository.findItems(row.id);
    const evaluation = await compat.validate(
      stored.map((i) => ({ category: i.category, componentId: i.componentId })),
    );
    const summaries = new Map(evaluation.items.map((i) => [i.category, i]));
    const items = stored.map((i) => ({
      ...summaries.get(i.category),
      offerId: i.offerId ?? null,
      unitPriceCop: i.unitPriceCop ?? null,
    }));
    const { items: _items, ...evaluationOnly } = evaluation;
    return {
      build: {
        id: row.id,
        name: row.name,
        shareCode: row.shareCode,
        estimatedWatts: row.estimatedWatts ?? null,
        totalPriceCop: items.reduce((sum, i) => sum + (i.unitPriceCop ?? 0), 0),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        isOwner: Boolean(viewerId) && row.userId === viewerId,
        items,
      },
      evaluation: evaluationOnly,
    };
  }

  return {
    /** Guarda un armado. Sin sesión (`userId` nulo) queda anónimo y solo se abre con su enlace. */
    async save(userId, { name, items, draft }) {
      const prepared = await prepare(items, { draft });
      const id = await createWithCode({
        userId: userId ?? null,
        name,
        estimatedWatts: prepared.estimatedWatts,
        items: prepared.items,
      });
      return present(await repository.findById(id), userId);
    },

    /** Abre un armado por su código (público: es el enlace compartible). */
    async getByShareCode(shareCode, viewerId) {
      const row = await repository.findByShareCode(shareCode);
      if (!row) throw notFound();
      return present(row, viewerId);
    },

    async list(userId) {
      return (await repository.listByUser(userId)).map((row) => ({
        id: row.id,
        name: row.name,
        shareCode: row.shareCode,
        estimatedWatts: row.estimatedWatts ?? null,
        totalPriceCop: row.totalPriceCop,
        itemCount: row.itemCount,
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
      }));
    },

    /** Reemplaza nombre y piezas de un armado propio (se vuelve a validar). */
    async update(userId, buildId, { name, items, draft }) {
      const prepared = await prepare(items, { draft });
      const done = await repository.replace(buildId, userId, {
        name,
        estimatedWatts: prepared.estimatedWatts,
        items: prepared.items,
      });
      if (!done) throw notFound();
      return present(await repository.findOwnedById(buildId, userId), userId);
    },

    async remove(userId, buildId) {
      if (!(await repository.remove(buildId, userId))) throw notFound();
    },

    /** Copia a la cuenta del usuario un armado compartido (o uno propio): "editar copia". */
    async clone(userId, shareCode) {
      const source = await repository.findByShareCode(shareCode);
      if (!source) throw notFound();
      const stored = await repository.findItems(source.id);
      const id = await createWithCode({
        userId,
        name: `${source.name} (copia)`.slice(0, 100),
        estimatedWatts: source.estimatedWatts ?? null,
        items: stored.map((i) => ({
          category: i.category,
          componentId: i.componentId,
          offerId: i.offerId ?? null,
          unitPriceCop: i.unitPriceCop ?? null,
        })),
      });
      return present(await repository.findById(id), userId);
    },

    async listWishlist(userId) {
      return (await repository.listWishlist(userId)).map((row) => ({
        componentId: row.componentId,
        category: row.category,
        brand: row.brand,
        model: row.model,
        displayName: row.displayName,
        minPriceCop: row.minPriceCop ?? null,
        offersCount: row.offersCount,
        addedAt: iso(row.addedAt),
      }));
    },

    /** Idempotente: agregar dos veces el mismo componente deja una sola fila. */
    async addToWishlist(userId, componentId) {
      if (!(await catalog.exists(componentId))) throw new AppError('COMPONENT_NOT_FOUND');
      await repository.addToWishlist(userId, componentId);
    },

    async removeFromWishlist(userId, componentId) {
      await repository.removeFromWishlist(userId, componentId);
    },
  };
}
