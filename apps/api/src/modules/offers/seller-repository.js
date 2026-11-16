/**
 * SQL del inventario del vendedor (escritura de `offers.offers` y `offers.offer_images`).
 * El nombre de cada producto sale de readmodel.component_summary (regla M-3).
 */
const OFFER_SELECT = `
  SELECT o.id AS offer_id, o.status::text AS status, o.price_cop, o.item_condition::text AS item_condition,
         o.warranty_months, o.description, o.published_at, o.updated_at,
         cs.component_id, cs.category, cs.brand, cs.model, cs.display_name,
         COALESCE((SELECT json_agg(json_build_object('key', i.storage_key, 'position', i.position)
                                   ORDER BY i.position)
                     FROM offers.offer_images i WHERE i.offer_id = o.id), '[]'::json) AS images
    FROM offers.offers o
    JOIN readmodel.component_summary cs ON cs.component_id = o.component_id`;

/** Campos editables → columna. Lista cerrada: nada más llega al SQL. */
const UPDATABLE = {
  priceCop: 'price_cop',
  warrantyMonths: 'warranty_months',
  description: 'description',
};

async function replaceImages(tx, offerId, keys) {
  await tx.query('DELETE FROM offers.offer_images WHERE offer_id = $1', [offerId]);
  for (const [index, key] of keys.entries()) {
    await tx.query(
      'INSERT INTO offers.offer_images (offer_id, storage_key, position) VALUES ($1, $2, $3)',
      [offerId, key, index + 1],
    );
  }
}

/** @param {{ query: Function, transaction: Function }} db */
export function createSellerOffersRepository(db) {
  return {
    async listByStore(storeId) {
      const { rows } = await db.query(
        `${OFFER_SELECT} WHERE o.store_id = $1 AND o.deleted_at IS NULL
          ORDER BY o.updated_at DESC, o.id DESC`,
        [storeId],
      );
      return rows;
    },

    /** Una oferta del comercio (que no esté dada de baja), o null. */
    async findOwned(offerId, storeId, executor = db) {
      const { rows } = await executor.query(
        `${OFFER_SELECT} WHERE o.id = $1 AND o.store_id = $2 AND o.deleted_at IS NULL`,
        [offerId, storeId],
      );
      return rows[0] ?? null;
    },

    /** Crea la oferta y sus fotos en una sola transacción. Devuelve el id. */
    async createWithImages({
      storeId,
      componentId,
      priceCop,
      condition,
      warrantyMonths,
      description,
      imageKeys,
    }) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query(
          `INSERT INTO offers.offers (store_id, component_id, price_cop, item_condition, warranty_months, description)
           VALUES ($1, $2, $3, $4::offers.item_condition, $5, $6)
           RETURNING id`,
          [storeId, componentId, priceCop, condition, warrantyMonths, description],
        );
        await replaceImages(tx, rows[0].id, imageKeys);
        return rows[0].id;
      });
    },

    /** Actualiza campos y/o fotos. Devuelve false si la oferta no es del comercio. */
    async updateWithImages(offerId, storeId, patch) {
      return db.transaction(async (tx) => {
        const params = [offerId, storeId];
        const sets = [];
        for (const [field, column] of Object.entries(UPDATABLE)) {
          if (!Object.hasOwn(patch, field)) continue;
          params.push(patch[field]);
          sets.push(`${column} = $${params.length}`);
        }
        // Siempre se actualiza algo (updated_at) para confirmar que la oferta existe y es del comercio
        const { rowCount } = await tx.query(
          `UPDATE offers.offers SET ${[...sets, 'updated_at = now()'].join(', ')}
            WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
          params,
        );
        if (rowCount === 0) return false;
        if (patch.imageKeys) await replaceImages(tx, offerId, patch.imageKeys);
        return true;
      });
    },

    async setStatus(offerId, storeId, status) {
      const { rowCount } = await db.query(
        `UPDATE offers.offers SET status = $3::offers.offer_status
          WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
        [offerId, storeId, status],
      );
      return rowCount > 0;
    },

    /** Baja lógica (HU-19): la oferta deja de existir para todos y libera la combinación única. */
    async softDelete(offerId, storeId) {
      const { rowCount } = await db.query(
        `UPDATE offers.offers SET deleted_at = now()
          WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
        [offerId, storeId],
      );
      return rowCount > 0;
    },

    async countByStatus(storeId) {
      const { rows } = await db.query(
        `SELECT status::text AS status, count(*)::int AS total
           FROM offers.offers WHERE store_id = $1 AND deleted_at IS NULL GROUP BY 1`,
        [storeId],
      );
      const counts = { active: 0, paused: 0 };
      for (const row of rows) counts[row.status] = row.total;
      return counts;
    },
  };
}
