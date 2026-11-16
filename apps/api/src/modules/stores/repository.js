const COLUMNS = `id, legal_name, trade_name, nit, description, logo_key, whatsapp_e164, department,
  city, address, commercial_center, latitude, longitude, opening_hours, is_verified`;

/** Campos del perfil que se pueden actualizar → columna. Es una lista cerrada: nada más llega al SQL. */
const UPDATABLE = {
  legalName: 'legal_name',
  tradeName: 'trade_name',
  nit: 'nit',
  description: 'description',
  whatsappE164: 'whatsapp_e164',
  department: 'department',
  city: 'city',
  address: 'address',
  commercialCenter: 'commercial_center',
  latitude: 'latitude',
  longitude: 'longitude',
  openingHours: 'opening_hours',
};

/** Acceso a `stores.stores`. @param {{ query: Function }} db */
export function createStoresRepository(db) {
  return {
    async findByOwner(userId) {
      const { rows } = await db.query(
        `SELECT ${COLUMNS} FROM stores.stores WHERE owner_user_id = $1`,
        [userId],
      );
      return rows[0] ?? null;
    },

    async findById(id) {
      const { rows } = await db.query(`SELECT ${COLUMNS} FROM stores.stores WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },

    /** Crea el comercio del usuario. Si ya tiene uno devuelve null (un usuario = un comercio). */
    async insert({ ownerUserId, legalName, tradeName }) {
      const { rows } = await db.query(
        `INSERT INTO stores.stores (owner_user_id, legal_name, trade_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (owner_user_id) DO NOTHING
         RETURNING ${COLUMNS}`,
        [ownerUserId, legalName, tradeName],
      );
      return rows[0] ?? null;
    },

    /** @param {Record<string, unknown>} patch campos de UPDATABLE */
    async update(storeId, patch) {
      const sets = [];
      const params = [storeId];
      for (const [field, column] of Object.entries(UPDATABLE)) {
        if (!Object.hasOwn(patch, field)) continue;
        const value = patch[field];
        params.push(field === 'openingHours' && value !== null ? JSON.stringify(value) : value);
        sets.push(`${column} = $${params.length}${field === 'openingHours' ? '::jsonb' : ''}`);
      }
      if (sets.length === 0) return this.findById(storeId);
      const { rows } = await db.query(
        `UPDATE stores.stores SET ${sets.join(', ')}, updated_at = now()
          WHERE id = $1 RETURNING ${COLUMNS}`,
        params,
      );
      return rows[0] ?? null;
    },
  };
}
