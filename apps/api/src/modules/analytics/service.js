import { AppError } from '../../kernel/errors.js';

/**
 * Ventana de descarte de eventos repetidos de la misma sesión sobre la misma oferta.
 * Evita métricas infladas por recargas o doble clic (Diseño Integral, 10.3).
 */
export const DEDUPE_WINDOW_SECONDS = {
  view: 30 * 60,
  whatsapp_click: 10 * 60,
};

export const MAX_RANGE_DAYS = 90;
const DAY_MS = 86_400_000;

/** Día calendario en Colombia (AAAA-MM-DD). */
const bogotaDay = (date) => date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const toMs = (day) => Date.parse(`${day}T00:00:00Z`);
const fromMs = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * @param {{
 *   repository: ReturnType<import('./repository.js').createAnalyticsRepository>,
 *   offers: { getOffer: (id: string) => Promise<{ store: { id: string } }>,
 *             countByStatus?: (storeId: string) => Promise<{ active: number, paused: number }> },
 *   stores?: { getStoreByOwner: (userId: string) => Promise<{ id: string } | null> },
 *   hashSession: (ip?: string, userAgent?: string) => string,
 * }} deps `offers` y `stores` son las fachadas públicas de esos módulos (regla M-1)
 */
export function createAnalyticsService({ repository, offers, stores, hashSession }) {
  return {
    /**
     * Resumen del panel del vendedor (HU-17): totales y serie diaria del rango, en hora de Colombia.
     * Por defecto, los últimos 7 días. Las ofertas activas y pausadas son las de hoy, no las del rango.
     */
    async getSellerSummary(userId, { from, to } = {}, now = new Date()) {
      const store = await stores.getStoreByOwner(userId);
      if (!store)
        throw new AppError('NOT_FOUND', { message: 'Aún no tienes un negocio registrado.' });

      const toDay = to ?? bogotaDay(now);
      const fromDay = from ?? fromMs(toMs(toDay) - 6 * DAY_MS);
      const days = (toMs(toDay) - toMs(fromDay)) / DAY_MS + 1;
      if (days < 1 || days > MAX_RANGE_DAYS) {
        throw new AppError('VALIDATION_ERROR', {
          message: `El rango debe ser de 1 a ${MAX_RANGE_DAYS} días.`,
        });
      }

      const [rows, counts] = await Promise.all([
        repository.dailyCounts(store.id, fromDay, toDay),
        offers.countByStatus(store.id),
      ]);
      const byDay = new Map(rows.map((row) => [row.day, row]));
      const daily = Array.from({ length: days }, (_, i) => {
        const day = fromMs(toMs(fromDay) + i * DAY_MS);
        const row = byDay.get(day);
        return { day, views: row?.views ?? 0, whatsappClicks: row?.whatsappClicks ?? 0 };
      });
      return {
        totals: {
          views: daily.reduce((sum, d) => sum + d.views, 0),
          whatsappClicks: daily.reduce((sum, d) => sum + d.whatsappClicks, 0),
          activeOffers: counts.active,
          pausedOffers: counts.paused,
        },
        daily,
      };
    },

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
