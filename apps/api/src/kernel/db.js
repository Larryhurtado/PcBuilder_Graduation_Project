import pg from 'pg';
import { translateDbError } from './db-errors.js';

// node-pg entrega numeric y bigint como texto. En este proyecto los precios son enteros en COP
// (numeric(12,0)) y los conteos son pequeños, así que se convierten a número al leerlos.
const PG_BIGINT = 20;
const PG_NUMERIC = 1700;
pg.types.setTypeParser(PG_BIGINT, (value) => Number(value));
pg.types.setTypeParser(PG_NUMERIC, (value) => Number(value));

/** @param {string} databaseUrl */
export function createPool(databaseUrl) {
  return new pg.Pool({ connectionString: databaseUrl, max: 10 });
}

/** snake_case → camelCase (tdp_w → tdpW, m2_slots → m2Slots). */
export function toCamel(key) {
  return key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/** Convierte las columnas de primer nivel; el contenido de los jsonb no se toca. */
export function camelizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) out[toCamel(key)] = value;
  return out;
}

/** Ejecutor de consultas sobre un pool o sobre un cliente de transacción. */
function executor(target) {
  return {
    /**
     * @param {string} text SQL con parámetros $1, $2…
     * @param {unknown[]} [params]
     * @returns {Promise<{ rows: any[], rowCount: number }>}
     */
    async query(text, params = []) {
      try {
        const result = await target.query(text, params);
        return { rows: result.rows.map(camelizeRow), rowCount: result.rowCount };
      } catch (error) {
        throw translateDbError(error);
      }
    },
  };
}

/**
 * Acceso a la base de datos para los repositorios (sin ORM, SQL parametrizado):
 * - `query`: ejecuta una consulta en el pool.
 * - `transaction(fn)`: ejecuta `fn(tx)` dentro de BEGIN/COMMIT; ante un error hace ROLLBACK.
 *   `tx` tiene la misma interfaz `query`.
 * @param {{ query: Function, connect: Function }} pool
 */
export function createDb(pool) {
  return {
    ...executor(pool),

    async transaction(fn) {
      const client = await pool.connect();
      let discard = false;
      try {
        await client.query('BEGIN');
        const result = await fn(executor(client));
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          discard = true; // la conexión está rota: se descarta en vez de devolverla al pool
        }
        throw error;
      } finally {
        client.release(discard);
      }
    },
  };
}
