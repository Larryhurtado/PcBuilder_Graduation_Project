import { defaultRules, evaluate, slotForCategory, STATUS } from '@hw/compat-engine';

/** Nombre de cada regla (RC-01 … RC-08), tomado del propio motor. */
export const ruleNames = Object.fromEntries(defaultRules.map((rule) => [rule.code, rule.name]));

/** Grupo de cada regla, para el rótulo del aviso. */
const RULE_GROUP = {
  'RC-01': 'COMPATIBILIDAD',
  'RC-02': 'COMPATIBILIDAD',
  'RC-03': 'COMPATIBILIDAD',
  'RC-07': 'COMPATIBILIDAD',
  'RC-04': 'FÍSICA',
  'RC-05': 'FÍSICA',
  'RC-06': 'FÍSICA',
  'RC-08': 'ELÉCTRICA',
};

/** Pieza que conviene cambiar para resolver una regla (el botón "Ver … compatibles"). */
export const SUGGESTED_FIX = {
  'RC-01': 'motherboard',
  'RC-02': 'ram',
  'RC-03': 'ram',
  'RC-04': 'case',
  'RC-05': 'case',
  'RC-06': 'cooler',
  'RC-07': 'cooler',
  'RC-08': 'psu',
};

/** Rótulo del aviso: "ALERTA FÍSICA" ante un conflicto, "INFORMACIÓN" ante un dato faltante. */
export function alertLabel(result) {
  return result.status === STATUS.FAIL
    ? `ALERTA ${RULE_GROUP[result.code] ?? 'TÉCNICA'}`
    : 'INFORMACIÓN';
}

/** El motor recibe las especificaciones por ranura; la caja se llama `pcCase`. */
export function toEngineBuild(parts) {
  return Object.fromEntries(
    Object.entries(parts).map(([category, offer]) => [
      slotForCategory(category),
      offer.component.specs,
    ]),
  );
}

/** Peor estado de una lista de resultados: fail > unknown > ok; sin reglas, 'none'. */
function worstStatus(results) {
  if (results.some((r) => r.status === STATUS.FAIL)) return STATUS.FAIL;
  if (results.some((r) => r.status === STATUS.UNKNOWN)) return STATUS.UNKNOWN;
  if (results.some((r) => r.status === STATUS.OK)) return STATUS.OK;
  return 'none';
}

/** Carga de la fuente: hasta 80 % holgada (RC-08), hasta 100 % justa, más es insuficiente. */
export function loadLevel(percent) {
  if (percent <= 80) return 'ok';
  if (percent <= 100) return 'warn';
  return 'danger';
}

/**
 * Evalúa el armado completo y lo resume para la pantalla.
 * @param {Record<string, any>} parts oferta elegida por categoría
 */
export function analyzeBuild(parts) {
  const evaluation = evaluate(toEngineBuild(parts));
  const results = evaluation.results.filter((result) => result.status !== STATUS.NOT_APPLICABLE);

  // Los `parts` de cada resultado son nombres de categoría (cpu, motherboard, case…)
  const bySlot = Object.fromEntries(
    Object.keys(parts).map((category) => {
      const relevant = results.filter((result) => result.parts.includes(category));
      return [category, { status: worstStatus(relevant), results: relevant }];
    }),
  );

  const psuWatts = parts.psu?.component.specs.wattageW;
  const percent =
    evaluation.estimatedWatts > 0 && psuWatts > 0
      ? Math.round((evaluation.estimatedWatts / psuWatts) * 1000) / 10
      : null;

  const offersList = Object.values(parts);
  return {
    results,
    failures: results.filter((r) => r.status === STATUS.FAIL),
    unknowns: results.filter((r) => r.status === STATUS.UNKNOWN),
    oks: results.filter((r) => r.status === STATUS.OK),
    summary: evaluation.summary,
    estimatedWatts: evaluation.estimatedWatts,
    recommendedPsuW: evaluation.recommendedPsuW,
    load: percent === null ? null : { percent, level: loadLevel(percent), watts: psuWatts },
    bySlot,
    count: offersList.length,
    total: offersList.reduce((sum, offer) => sum + offer.priceCop, 0),
  };
}

/**
 * Cómo encajaría una pieza candidata en el armado actual (solo las reglas que la involucran).
 * El selector oculta las `fail`, y las `unknown` salen como "No verificable".
 * No usa `evaluateCandidate` del motor: con la caja compara contra `pcCase` y las reglas
 * nombran `case`, así que nunca detecta sus conflictos.
 * @param {string} category
 * @param {Record<string, any>} specs
 * @param {Record<string, any>} parts
 */
export function candidateStatus(category, specs, parts) {
  const build = { ...toEngineBuild(parts), [slotForCategory(category)]: specs };
  const relevant = evaluate(build).results.filter(
    (result) => result.status !== STATUS.NOT_APPLICABLE && result.parts.includes(category),
  );
  return { status: worstStatus(relevant), results: relevant };
}

/** "Falta X" → "falta X" para frases como "No verificable: falta X; confírmalo con la tienda". */
export const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
