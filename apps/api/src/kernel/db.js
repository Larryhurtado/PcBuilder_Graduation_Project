import pg from 'pg';

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
