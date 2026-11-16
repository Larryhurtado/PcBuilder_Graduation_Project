/**
 * Ventana de descarte de eventos repetidos de la misma sesión sobre la misma oferta.
 * Evita métricas infladas por recargas o doble clic (Diseño Integral, 10.3).
 */
export const DEDUPE_WINDOW_SECONDS = {
  view: 30 * 60,
  whatsapp_click: 10 * 60,
};

/**
 * @param {{
 *   repository: ReturnType<import('./repository.js').createAnalyticsRepository>,
 *   offers: { getOffer: (id: string) => Promise<{ store: { id: string } }> },
 *   hashSession: (ip?: string, userAgent?: string) => string,
 * }} deps `offers` es la fachada pública del módulo offers (regla M-1)
 */
export function createAnalyticsService({ repository, offers, hashSession }) {
  return {
    /**
     * Registra una vista o un clic a WhatsApp. La oferta debe ser pública: si no existe, está
     * pausada o es de un comercio sin verificar, `offers.getOffer` lanza 404 y no se guarda nada.
     * Del visitante solo se conserva un hash anónimo: la IP y el agente de usuario no se guardan.
     * @returns {Promise<{ recorded: boolean }>}
     */
    async record({ offerId, type }, { ip, userAgent } = {}) {
      const offer = await offers.getOffer(offerId);
      const recorded = await repository.insertEvent({
        offerId,
        storeId: offer.store.id,
        type,
        sessionHash: hashSession(ip, userAgent),
        windowSeconds: DEDUPE_WINDOW_SECONDS[type],
      });
      return { recorded };
    },

    /** Crea las particiones del mes actual y del siguiente (se llama al arrancar la API). */
    async ensurePartitions(now = new Date()) {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
      for (const month of [first, next]) {
        await repository.ensureMonthPartition(month.toISOString().slice(0, 10));
      }
    },
  };
}
