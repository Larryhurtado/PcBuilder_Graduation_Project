/** Acceso a `verification.requests`. @param {{ query: Function }} db */
export function createVerificationRepository(db) {
  return {
    /** Abre la solicitud del comercio en estado `not_submitted` si no existe (idempotente). */
    async ensureRequest(storeId) {
      await db.query(
        'INSERT INTO verification.requests (store_id) VALUES ($1) ON CONFLICT (store_id) DO NOTHING',
        [storeId],
      );
    },

    async findByStore(storeId) {
      const { rows } = await db.query(
        `SELECT status::text AS status, submitted_at, reviewer_note, deadline_at, can_reapply_at
           FROM verification.requests WHERE store_id = $1`,
        [storeId],
      );
      return rows[0] ?? null;
    },
  };
}
