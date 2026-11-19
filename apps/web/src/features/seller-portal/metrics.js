/**
 * Cálculos de la página de métricas del vendedor. Todo sale de los registros diarios que ya trae la
 * API (`{ day, views, whatsappClicks }`, un registro por cada día del rango, los días sin eventos en
 * cero): no se inventa ningún dato que la API no entregue.
 */

/** Porcentaje de visitas que terminan en un clic a WhatsApp; null si no hubo visitas. */
export function clickRate(clicks, views) {
  return views > 0 ? (clicks / views) * 100 : null;
}

/**
 * Totales y promedios del rango.
 * @param {{ day: string, views: number, whatsappClicks: number }[]} days
 */
export function summarizeDays(days) {
  const views = days.reduce((sum, item) => sum + item.views, 0);
  const clicks = days.reduce((sum, item) => sum + item.whatsappClicks, 0);
  return {
    views,
    clicks,
    rate: clickRate(clicks, views),
    averageClicks: days.length > 0 ? clicks / days.length : null,
    days: days.length,
  };
}

/** Diferencia en puntos porcentuales entre dos tasas; null si falta alguna. */
export function rateChange(current, previous) {
  return current === null || previous === null ? null : current - previous;
}

/**
 * El día con más clics y el que menos. Si no hubo ningún clic en el rango no hay mejor ni peor día
 * (todos serían iguales). En un empate gana el día más antiguo.
 */
export function bestAndWorstDay(days) {
  if (!days.some((item) => item.whatsappClicks > 0)) return { best: null, worst: null };
  let best = days[0];
  let worst = days[0];
  for (const item of days) {
    if (item.whatsappClicks > best.whatsappClicks) best = item;
    if (item.whatsappClicks < worst.whatsappClicks) worst = item;
  }
  return { best, worst };
}

/** Lunes a domingo (la semana en Colombia empieza el lunes). */
export const WEEKDAYS = [
  ['lun', 'lunes'],
  ['mar', 'martes'],
  ['mié', 'miércoles'],
  ['jue', 'jueves'],
  ['vie', 'viernes'],
  ['sáb', 'sábado'],
  ['dom', 'domingo'],
];

/** Posición del día de la semana (lunes = 0) de una fecha `AAAA-MM-DD`. */
function weekdayIndex(day) {
  return (new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Promedio de clics por día de la semana. Un día de la semana que no aparece en el rango queda con
 * `average: null` (no se muestra como cero).
 * @returns {{ short: string, name: string, occurrences: number, clicks: number, average: number | null }[]}
 */
export function weekdayPattern(days) {
  const rows = WEEKDAYS.map(([short, name]) => ({
    short,
    name,
    occurrences: 0,
    clicks: 0,
    average: null,
  }));
  for (const item of days) {
    const row = rows[weekdayIndex(item.day)];
    row.occurrences += 1;
    row.clicks += item.whatsappClicks;
  }
  for (const row of rows) {
    row.average = row.occurrences > 0 ? row.clicks / row.occurrences : null;
  }
  return rows;
}

// Marca de orden de bytes (U+FEFF): sin ella Excel no lee bien los acentos de un CSV
const BOM = String.fromCharCode(0xfeff);

const csvRate = (clicks, views) => {
  const rate = clickRate(clicks, views);
  return rate === null ? '' : rate.toFixed(1).replace('.', ',');
};

/**
 * Los datos diarios como CSV para abrir en Excel en español: separador `;` y coma decimal. Lleva
 * la marca BOM para que los acentos se lean bien.
 */
export function dailyCsv(days) {
  const header = ['Fecha', 'Visitas', 'Clics a WhatsApp', 'Tasa de clic (%)'].join(';');
  const rows = days.map((item) =>
    [item.day, item.views, item.whatsappClicks, csvRate(item.whatsappClicks, item.views)].join(';'),
  );
  const totals = summarizeDays(days);
  rows.push(['Total', totals.views, totals.clicks, csvRate(totals.clicks, totals.views)].join(';'));
  return `${BOM}${[header, ...rows].join('\r\n')}\r\n`;
}

/** Nombre del archivo CSV de un rango. */
export const csvFilename = ({ from, to }) => `metricas-${from}_a_${to}.csv`;
