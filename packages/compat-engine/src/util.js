/** Utilidades internas del motor (JavaScript puro, sin dependencias). */

export const isNum = (value) => typeof value === 'number' && Number.isFinite(value);

export const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

/** Una lista con al menos un elemento. Una lista vacía cuenta como "dato desconocido". */
export const isList = (value) => Array.isArray(value) && value.length > 0;

/**
 * Normaliza nombres de socket, tipo de RAM o formato para compararlos:
 * "Micro ATX" = "Micro-ATX", "LGA 1700" = "LGA1700".
 */
export const norm = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[\s_-]/g, '');

export const same = (a, b) => norm(a) === norm(b);

export const includesNorm = (list, value) => list.some((item) => same(item, value));

/** "Falta A y B" a partir de las condiciones que faltan. */
export function missing(...entries) {
  const labels = entries.filter(([isMissing]) => isMissing).map(([, label]) => label);
  return `Falta ${labels.join(' y ')}`;
}

/** Redondeo para evitar errores de coma flotante en los múltiplos (390.00000000000006). */
export const round6 = (value) => Number(value.toFixed(6));
