import { escapeLike } from '../../kernel/sql.js';

const COLUMNS = `id, legal_name, trade_name, nit, description, logo_key, whatsapp_e164, department,
  city, address, commercial_center, latitude, longitude, opening_hours, is_verified`;

/**
 * Datos públicos de un comercio con la cantidad de ofertas visibles (readmodel.public_offers,
 * regla M-3). El listado y el detalle comparten esta consulta para que el conteo sea el mismo.
 */
const PUBLIC_SELECT = `
  SELECT s.id, s.trade_name, s.description, s.logo_key, s.department, s.city,
         s.commercial_center, s.address, s.whatsapp_e164,
         COALESCE(o.total, 0)::int AS offers_count
    FROM stores.stores s
    LEFT JOIN (SELECT store_id, count(*) AS total
                 FROM readmodel.public_offers GROUP BY store_id) o ON o.store_id = s.id`;

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

    /**
     * Comercios verificados para el directorio público, con la cantidad de ofertas visibles
     * (readmodel.public_offers, regla M-3). Primero los que tienen más ofertas.
     */
    async listVerified({ q, city, limit }) {
      const where = ['s.is_verified'];
      const params = [];
      if (q) {
        params.push(`%${escapeLike(q)}%`);
        where.push(`s.trade_name ILIKE $${params.length}`);
      }
      if (city) {
        params.push(city);
        where.push(`lower(s.city) = lower($${params.length})`);
      }
      params.push(limit);
      const { rows } = await db.query(
        `${PUBLIC_SELECT}
          WHERE ${where.join(' AND ')}
          ORDER BY COALESCE(o.total, 0) DESC, s.trade_name, s.id
          LIMIT $${params.length}`,
        params,
      );
      return rows;
    },

    /**
     * Un comercio verificado, con el mismo conteo de ofertas que el listado. Devuelve null si no
     * existe o no está verificado (pendiente, rechazado o suspendido): no se distingue.
     */
    async findVerifiedById(id) {
      const { rows } = await db.query(`${PUBLIC_SELECT} WHERE s.is_verified AND s.id = $1`, [id]);
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
