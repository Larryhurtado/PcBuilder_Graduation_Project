/**
 * Rangos de fechas del panel del vendedor. La API cuenta los días en hora de Colombia y recibe
 * fechas `AAAA-MM-DD`; aquí todo se calcula en UTC sobre esas cadenas para no depender de la zona
 * horaria del navegador.
 */

const DAY_MS = 86_400_000;

export const RANGES = [
  ['7d', '7 días'],
  ['30d', '30 días'],
  ['month', 'Este mes'],
];

export const DEFAULT_RANGE = '7d';

/** Hoy en hora de Colombia, como `AAAA-MM-DD`. */
export function todayInColombia(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/** Suma (o resta) días a una fecha `AAAA-MM-DD`. */
export function addDays(day, count) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
}

/** Cantidad de días de un rango, contando ambos extremos. */
export function daysIn({ from, to }) {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1;
}

/**
 * Rango elegido en el selector: los últimos 7 o 30 días contando hoy, o lo que va del mes.
 * @param {string} kind '7d' | '30d' | 'month'
 * @param {string} today fecha de hoy en Colombia
 */
export function rangeFor(kind, today) {
  if (kind === '30d') return { from: addDays(today, -29), to: today };
  if (kind === 'month') return { from: `${today.slice(0, 8)}01`, to: today };
  return { from: addDays(today, -6), to: today };
}

/** El periodo inmediatamente anterior, con la misma cantidad de días (para comparar). */
export function previousRange(range) {
  const length = daysIn(range);
  return { from: addDays(range.from, -length), to: addDays(range.from, -1) };
}

/** Un registro por cada día del rango; los días sin eventos que no trae la API quedan en cero. */
export function fillDays(range, daily) {
  const byDay = new Map(daily.map((item) => [item.day, item]));
  return Array.from({ length: daysIn(range) }, (_, index) => {
    const day = addDays(range.from, index);
    const found = byDay.get(day);
    return { day, views: found?.views ?? 0, whatsappClicks: found?.whatsappClicks ?? 0 };
  });
}

/** Cambio porcentual contra el periodo anterior; null si no hay con qué comparar (anterior en 0). */
export function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

const dayFormat = new Intl.DateTimeFormat('es-CO', {
  weekday: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});
const longDayFormat = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

/** "vie 22": etiqueta corta de un día para el eje del gráfico. */
export const shortDay = (day) => dayFormat.format(new Date(`${day}T00:00:00Z`)).replace('.', '');

/** "viernes, 22 de mayo": nombre completo para el detalle del gráfico. */
export const longDay = (day) => longDayFormat.format(new Date(`${day}T00:00:00Z`));
