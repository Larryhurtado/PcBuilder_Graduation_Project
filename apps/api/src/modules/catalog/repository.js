/**
 * SQL del módulo catalog (Base de Datos Maestra). Es el único archivo del módulo que escribe SQL.
 * Las columnas llegan en camelCase porque `db.query` convierte el primer nivel de cada fila.
 */

const COMPONENT_COLUMNS = `
  c.id, c.category, b.name::text AS brand, c.model, c.display_name, c.release_year,
  c.version, c.updated_at,
  ds.name AS source_name, ds.license AS source_license, ds.attribution_text AS source_attribution`;

/** Consulta de especificaciones por categoría: una por tabla catalog.*_specs. */
const SPEC_QUERIES = {
  cpu: `SELECT s.component_id, sk.name::text AS socket, s.tdp_w, s.cores, s.threads,
               s.base_clock_ghz, s.boost_clock_ghz, s.memory_types, s.has_integrated_graphics
          FROM catalog.cpu_specs s JOIN catalog.sockets sk ON sk.id = s.socket_id
         WHERE s.component_id = ANY($1::uuid[])`,
  motherboard: `SELECT s.component_id, sk.name::text AS socket, s.form_factor, s.chipset, s.ram_type,
               s.ram_slots, s.ram_max_gb, s.m2_slots
          FROM catalog.motherboard_specs s JOIN catalog.sockets sk ON sk.id = s.socket_id
         WHERE s.component_id = ANY($1::uuid[])`,
  ram: `SELECT s.component_id, s.ram_type, s.speed_mhz, s.modules_qty, s.capacity_gb,
               s.form_factor, s.cas_latency
          FROM catalog.ram_specs s WHERE s.component_id = ANY($1::uuid[])`,
  gpu: `SELECT s.component_id, s.tdp_w, s.length_mm, s.slot_width, s.interface, s.memory_gb,
               s.power_connectors
          FROM catalog.gpu_specs s WHERE s.component_id = ANY($1::uuid[])`,
  psu: `SELECT s.component_id, s.wattage_w, s.form_factor, s.efficiency_rating, s.modular, s.connectors
          FROM catalog.psu_specs s WHERE s.component_id = ANY($1::uuid[])`,
  case: `SELECT s.component_id, s.form_factor, s.supported_mb_form_factors,
               s.supported_psu_form_factors, s.max_gpu_length_mm, s.max_cooler_height_mm
          FROM catalog.case_specs s WHERE s.component_id = ANY($1::uuid[])`,
  cooler: `SELECT s.component_id, s.height_mm, s.water_cooled, s.radiator_mm,
               COALESCE((SELECT array_agg(sk.name::text ORDER BY sk.name)
                           FROM catalog.cooler_sockets cs
                           JOIN catalog.sockets sk ON sk.id = cs.socket_id
                          WHERE cs.cooler_id = s.component_id), '{}'::text[]) AS sockets
          FROM catalog.cooler_specs s WHERE s.component_id = ANY($1::uuid[])`,
  storage: `SELECT s.component_id, s.storage_type, s.interface, s.capacity_gb, s.form_factor
          FROM catalog.storage_specs s WHERE s.component_id = ANY($1::uuid[])`,
};

/** Escapa % y _ para usar el texto del usuario dentro de un ILIKE. */
export function escapeLike(text) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** @param {{ query: Function }} db */
export function createCatalogRepository(db) {
  return {
    /** Componentes activos con marca y fuente de datos. */
    async findComponents(ids) {
      const { rows } = await db.query(
        `SELECT ${COMPONENT_COLUMNS}
           FROM catalog.components c
           JOIN catalog.brands b ON b.id = c.brand_id
           LEFT JOIN catalog.data_sources ds ON ds.id = c.source_id
          WHERE c.id = ANY($1::uuid[]) AND c.status = 'active'`,
        [ids],
      );
      return rows;
    },

    /** Especificaciones de los componentes de una categoría (una fila por componente). */
    async findSpecs(category, ids) {
      const sql = SPEC_QUERIES[category];
      if (!sql) throw new Error(`Categoría desconocida: ${category}`);
      const { rows } = await db.query(sql, [ids]);
      return rows;
    },

    /** Buscador global: texto contenido en el nombre o modelo, o similar (tolera errores de escritura). */
    async search(term, limit) {
      const { rows } = await db.query(
        `SELECT c.id, c.category, b.name::text AS brand, c.model, c.display_name,
                bp.min_price_cop, COALESCE(bp.offers_count, 0) AS offers_count
           FROM catalog.components c
           JOIN catalog.brands b ON b.id = c.brand_id
           LEFT JOIN readmodel.best_price_by_component bp ON bp.component_id = c.id
          WHERE c.status = 'active'
            AND (c.display_name ILIKE $2 OR c.model ILIKE $2 OR similarity(c.display_name, $1) > 0.3)
          ORDER BY (bp.offers_count IS NOT NULL) DESC, similarity(c.display_name, $1) DESC, c.display_name
          LIMIT $3`,
        [term, `%${escapeLike(term)}%`, limit],
      );
      return rows;
    },
  };
}
