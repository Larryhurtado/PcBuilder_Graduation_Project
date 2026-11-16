/** SQL del módulo analytics. Solo escribe en su esquema (regla M-3). */

/** @param {{ query: Function }} db */
export function createAnalyticsRepository(db) {
  return {
    /**
     * Inserta el evento salvo que ya exista uno igual (misma oferta, tipo y sesión) dentro de la
     * ventana indicada. Devuelve `true` si se insertó y `false` si se descartó por repetido.
     */
    async insertEvent({ offerId, storeId, type, sessionHash, windowSeconds }) {
      const { rowCount } = await db.query(
        `INSERT INTO analytics.offer_events (offer_id, store_id, event_type, session_hash)
         SELECT $1::uuid, $2::uuid, $3::analytics.event_type, $4
          WHERE NOT EXISTS (
                SELECT 1 FROM analytics.offer_events
                 WHERE offer_id = $1::uuid
                   AND event_type = $3::analytics.event_type
                   AND session_hash = $4
                   AND occurred_at > now() - make_interval(secs => $5::double precision))`,
        [offerId, storeId, type, sessionHash, windowSeconds],
      );
      return rowCount > 0;
    },

    /**
     * Vistas y clics por día (hora de Colombia) de un comercio entre dos días, ambos incluidos.
     * Los días sin eventos no aparecen: el servicio los rellena con ceros.
     */
    async dailyCounts(storeId, fromDay, toDay) {
      const { rows } = await db.query(
        `SELECT (occurred_at AT TIME ZONE 'America/Bogota')::date::text AS day,
                count(*) FILTER (WHERE event_type = 'view')::int AS views,
                count(*) FILTER (WHERE event_type = 'whatsapp_click')::int AS whatsapp_clicks
           FROM analytics.offer_events
          WHERE store_id = $1
            AND occurred_at >= $2::date::timestamp AT TIME ZONE 'America/Bogota'
            AND occurred_at <  ($3::date + 1)::timestamp AT TIME ZONE 'America/Bogota'
          GROUP BY 1
          ORDER BY 1`,
        [storeId, fromDay, toDay],
      );
      return rows;
    },

    /** Crea (si no existe) la partición mensual de la tabla de eventos que contiene `date`. */
    async ensureMonthPartition(date) {
      await db.query('SELECT analytics.ensure_month_partition($1::date)', [date]);
    },
  };
}
