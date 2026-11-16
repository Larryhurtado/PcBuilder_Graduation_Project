import { isNum } from './util.js';

/**
 * Parámetros del cálculo de consumo (tabla compat.params de la base de datos).
 * Se pueden sobrescribir al llamar al motor sin cambiar el código.
 */
export const defaultParams = Object.freeze({
  /** Consumo estimado de placa, RAM, almacenamiento y ventiladores. */
  baseSystemWatts: 75,
  /** Margen sobre el consumo estimado para recomendar la fuente. */
  psuHeadroomFactor: 1.25,
  /** Redondeo (hacia arriba) de la potencia recomendada. */
  psuRecommendedStep: 50,
});

// Nombres de las claves en compat.params
const DB_KEYS = {
  base_system_watts: 'baseSystemWatts',
  psu_headroom_factor: 'psuHeadroomFactor',
  psu_recommended_step: 'psuRecommendedStep',
};

/**
 * Completa los parámetros con los valores por defecto. Acepta nombres en camelCase o
 * los de la base de datos (snake_case) e ignora valores que no sean números positivos.
 * @param {Record<string, unknown>} [raw]
 */
export function resolveParams(raw = {}) {
  const params = { ...defaultParams };
  for (const [key, value] of Object.entries(raw ?? {})) {
    const name = DB_KEYS[key] ?? key;
    const number = Number(value);
    if (name in defaultParams && isNum(number) && number > 0) params[name] = number;
  }
  return params;
}
