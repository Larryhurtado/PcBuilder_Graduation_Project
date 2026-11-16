/**
 * SQL del módulo offers (lectura pública). Lee solo del esquema readmodel (regla M-3):
 *  - readmodel.public_offers: ofertas activas de comercios verificados.
 *  - readmodel.component_filter_attrs: atributos de los componentes para los filtros técnicos.
 * Las columnas llegan en camelCase porque `db.query` convierte el primer nivel de cada fila.
 */
import { createWhere, escapeLike, normSql, normValue } from '../../kernel/sql.js';

const LIST_COLUMNS = `
  po.offer_id, po.price_cop, po.item_condition, po.warranty_months, po.published_at,
  po.published_at::text AS published_at_raw,
  po.component_id, po.category, po.brand, po.model, po.display_name,
  po.store_id, po.store_name, po.city, po.department, po.commercial_center,
  po.whatsapp_e164, po.cover_image_key`;

const ORDER_BY = {
  price_asc: 'po.price_cop ASC, po.offer_id ASC',
  price_desc: 'po.price_cop DESC, po.offer_id DESC',
  newest: 'po.published_at DESC, po.offer_id DESC',
};

/** Condiciones de la página siguiente (paginación por claves). */
function addCursor(where, sort, cursor) {
  if (sort === 'price_asc')
    where.add('(po.price_cop, po.offer_id) > (?::numeric, ?::uuid)', cursor.value, cursor.id);
  else if (sort === 'price_desc')
    where.add('(po.price_cop, po.offer_id) < (?::numeric, ?::uuid)', cursor.value, cursor.id);
  else
    where.add(
      '(po.published_at, po.offer_id) < (?::timestamptz, ?::uuid)',
      cursor.value,
      cursor.id,
    );
}

/**
 * Filtros técnicos, solo para la categoría a la que aplican. Un dato desconocido (NULL) deja
 * pasar la pieza: se mostrará como "no verificable" en vez de ocultarse.
 */
function addTechnicalFilters(where, category, f) {
  const norms = (values) => values.map(normValue);
  const A = 'a';

  if ((category === 'cpu' || category === 'motherboard') && f.socket) {
    where.add(`${normSql(`${A}.socket`)} = ANY(?::text[])`, norms(f.socket));
  }
  if ((category === 'motherboard' || category === 'ram') && f.ram_type) {
    where.add(`${normSql(`${A}.ram_type`)} = ANY(?::text[])`, norms(f.ram_type));
  }
  if (category === 'motherboard' && f.form_factor) {
    where.add(`${normSql(`${A}.board_form_factor`)} = ANY(?::text[])`, norms(f.form_factor));
  }
  if (category === 'cooler') {
    if (f.cooler_socket) {
      where.add(
        `(${A}.cooler_sockets IS NULL OR EXISTS (SELECT 1 FROM unnest(${A}.cooler_sockets) s WHERE ${normSql('s')} = ANY(?::text[])))`,
        norms(f.cooler_socket),
      );
    }
    if (f.max_height_mm)
      where.add(`(${A}.cooler_height_mm IS NULL OR ${A}.cooler_height_mm <= ?)`, f.max_height_mm);
  }
  if (category === 'gpu' && f.max_length_mm) {
    where.add(`(${A}.gpu_length_mm IS NULL OR ${A}.gpu_length_mm <= ?)`, f.max_length_mm);
  }
  if (category === 'case') {
    if (f.supports_form_factor) {
      where.add(
        `EXISTS (SELECT 1 FROM unnest(${A}.case_mb_form_factors) ff WHERE ${normSql('ff')} = ?)`,
        normValue(f.supports_form_factor),
      );
    }
    if (f.min_gpu_length_mm) {
      where.add(
        `(${A}.max_gpu_length_mm IS NULL OR ${A}.max_gpu_length_mm >= ?)`,
        f.min_gpu_length_mm,
      );
    }
    if (f.min_cooler_height_mm) {
      where.add(
        `(${A}.max_cooler_height_mm IS NULL OR ${A}.max_cooler_height_mm >= ?)`,
        f.min_cooler_height_mm,
      );
    }
  }
  if (category === 'psu' && f.min_wattage_w) {
    where.add(`${A}.psu_wattage_w >= ?`, f.min_wattage_w);
  }
}

/**
 * Construye la consulta del listado. Función pura (se prueba sin base de datos).
 * @param {{ filters: Record<string, any>, sort: keyof typeof ORDER_BY, limit: number, cursor?: { value: string | number, id: string } | null }} input
 * @returns {{ text: string, params: unknown[] }}
 */
export function buildSearchQuery({ filters = {}, sort, limit, cursor = null }) {
  const where = createWhere();
  const f = filters;

  if (f.category) where.add('po.category::text = ?', f.category);
  if (f.brandId) where.add('po.brand_id = ?', f.brandId);
  if (f.componentId) where.add('po.component_id = ?::uuid', f.componentId);
  if (f.q) {
    const pattern = `%${escapeLike(f.q)}%`;
    where.add(
      '(po.display_name ILIKE ? OR po.model ILIKE ? OR po.brand::text ILIKE ?)',
      pattern,
      pattern,
      pattern,
    );
  }
  if (f.minPrice !== undefined) where.add('po.price_cop >= ?', f.minPrice);
  if (f.maxPrice !== undefined) where.add('po.price_cop <= ?', f.maxPrice);
  if (f.condition) where.add('po.item_condition::text = ?', f.condition);
  if (f.city) where.add('lower(po.city) = lower(?)', f.city);
  if (f.commercialCenter) where.add('lower(po.commercial_center) = lower(?)', f.commercialCenter);
  if (f.storeId) where.add('po.store_id = ?::uuid', f.storeId);
  addTechnicalFilters(where, f.category, f);
  if (cursor) addCursor(where, sort, cursor);

  const limitMark = where.param(limit);
  const text = `SELECT ${LIST_COLUMNS}
  FROM readmodel.public_offers po
  JOIN readmodel.component_filter_attrs a ON a.component_id = po.component_id
  ${where.toSql()}
 ORDER BY ${ORDER_BY[sort]}
 LIMIT ${limitMark}`;
  return { text, params: where.params };
}

/** @param {{ query: Function }} db */
export function createOffersRepository(db) {
  return {
    /** Ofertas públicas con filtros, orden y cursor. Pide una fila de más para saber si hay otra página. */
    async search(input) {
      const { text, params } = buildSearchQuery(input);
      const { rows } = await db.query(text, params);
      return rows;
    },

    /** Una oferta pública con los datos del detalle (descripción y ubicación del local). */
    async findPublicById(id) {
      const { rows } = await db.query(
        `SELECT ${LIST_COLUMNS}, po.description, po.address, po.latitude, po.longitude
           FROM readmodel.public_offers po
          WHERE po.offer_id = $1::uuid`,
        [id],
      );
      return rows[0] ?? null;
    },

    /** Fotos de una oferta, en orden. */
    async findImages(offerId) {
      const { rows } = await db.query(
        'SELECT storage_key, position, alt_text FROM offers.offer_images WHERE offer_id = $1::uuid ORDER BY position',
        [offerId],
      );
      return rows;
    },
  };
}
