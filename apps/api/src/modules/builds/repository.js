/**
 * SQL del módulo builds: armados guardados y favoritos. La lista de favoritos lee los precios y
 * nombres de los componentes desde el esquema readmodel (regla M-3).
 * @param {{ query: Function, transaction: Function }} db
 */
export function createBuildsRepository(db) {
  const BUILD_COLUMNS = `b.id, b.user_id, b.name, b.share_code, b.estimated_watts, b.created_at, b.updated_at`;

  async function insertItems(tx, buildId, items) {
    for (const item of items) {
      await tx.query(
        `INSERT INTO builds.build_items (build_id, category, slot, component_id, offer_id, unit_price_cop)
         VALUES ($1, $2::catalog.component_category, 1, $3, $4, $5)`,
        [buildId, item.category, item.componentId, item.offerId ?? null, item.unitPriceCop ?? null],
      );
    }
  }

  return {
    /** Crea el armado y sus piezas en una transacción. Un código repetido sale como error 23505. */
    async create({ userId, name, shareCode, estimatedWatts, items }) {
      return db.transaction(async (tx) => {
        const { rows } = await tx.query(
          `INSERT INTO builds.builds (user_id, name, share_code, estimated_watts)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [userId ?? null, name, shareCode, estimatedWatts],
        );
        await insertItems(tx, rows[0].id, items);
        return rows[0].id;
      });
    },

    /** Reemplaza nombre, consumo y piezas de un armado del usuario. Devuelve false si no es suyo. */
    async replace(buildId, userId, { name, estimatedWatts, items }) {
      return db.transaction(async (tx) => {
        const { rowCount } = await tx.query(
          `UPDATE builds.builds SET name = $3, estimated_watts = $4, updated_at = now()
            WHERE id = $1 AND user_id = $2`,
          [buildId, userId, name, estimatedWatts],
        );
        if (rowCount === 0) return false;
        await tx.query('DELETE FROM builds.build_items WHERE build_id = $1', [buildId]);
        await insertItems(tx, buildId, items);
        return true;
      });
    },

    async remove(buildId, userId) {
      const { rowCount } = await db.query(
        'DELETE FROM builds.builds WHERE id = $1 AND user_id = $2',
        [buildId, userId],
      );
      return rowCount > 0;
    },

    async findByShareCode(shareCode) {
      const { rows } = await db.query(
        `SELECT ${BUILD_COLUMNS} FROM builds.builds b WHERE b.share_code = $1`,
        [shareCode],
      );
      return rows[0] ?? null;
    },

    async findById(buildId) {
      const { rows } = await db.query(
        `SELECT ${BUILD_COLUMNS} FROM builds.builds b WHERE b.id = $1`,
        [buildId],
      );
      return rows[0] ?? null;
    },

    async findOwnedById(buildId, userId) {
      const { rows } = await db.query(
        `SELECT ${BUILD_COLUMNS} FROM builds.builds b WHERE b.id = $1 AND b.user_id = $2`,
        [buildId, userId],
      );
      return rows[0] ?? null;
    },

    async findItems(buildId) {
      const { rows } = await db.query(
        `SELECT category::text AS category, component_id, offer_id, unit_price_cop
           FROM builds.build_items WHERE build_id = $1 ORDER BY category`,
        [buildId],
      );
      return rows;
    },

    /** Armados del usuario con el total y la cantidad de piezas, del más reciente al más antiguo. */
    async listByUser(userId) {
      const { rows } = await db.query(
        `SELECT ${BUILD_COLUMNS},
                COALESCE((SELECT sum(unit_price_cop) FROM builds.build_items i WHERE i.build_id = b.id), 0) AS total_price_cop,
                (SELECT count(*) FROM builds.build_items i WHERE i.build_id = b.id)::int AS item_count
           FROM builds.builds b
          WHERE b.user_id = $1
          ORDER BY b.updated_at DESC, b.id DESC`,
        [userId],
      );
      return rows;
    },

    /** Cuenta eliminada: borra sus favoritos y deja sus armados sin dueño (siguen abiertos por su enlace). */
    async detachUser(userId) {
      await db.query('DELETE FROM builds.wishlist_items WHERE user_id = $1', [userId]);
      await db.query('UPDATE builds.builds SET user_id = NULL WHERE user_id = $1', [userId]);
    },

    async listWishlist(userId) {
      const { rows } = await db.query(
        `SELECT w.component_id, w.created_at AS added_at,
                cs.category::text AS category, cs.brand, cs.model, cs.display_name,
                bp.min_price_cop, COALESCE(bp.offers_count, 0)::int AS offers_count
           FROM builds.wishlist_items w
           JOIN readmodel.component_summary cs ON cs.component_id = w.component_id
           LEFT JOIN readmodel.best_price_by_component bp ON bp.component_id = w.component_id
          WHERE w.user_id = $1
          ORDER BY w.created_at DESC, w.component_id`,
        [userId],
      );
      return rows;
    },

    async addToWishlist(userId, componentId) {
      await db.query(
        `INSERT INTO builds.wishlist_items (user_id, component_id) VALUES ($1, $2)
         ON CONFLICT (user_id, component_id) DO NOTHING`,
        [userId, componentId],
      );
    },

    async removeFromWishlist(userId, componentId) {
      await db.query('DELETE FROM builds.wishlist_items WHERE user_id = $1 AND component_id = $2', [
        userId,
        componentId,
      ]);
    },
  };
}
