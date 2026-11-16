import { resolveParams } from './params.js';
import { estimateWatts } from './power.js';
import { STATUS } from './results.js';
import { defaultRules } from './rules.js';

/**
 * Conteo de resultados por estado. `incompatible` cuenta las reglas en estado fail.
 * @param {{ status: string }[]} results
 */
export function summarize(results) {
  return {
    incompatible: results.filter((r) => r.status === STATUS.FAIL).length,
    unknown: results.filter((r) => r.status === STATUS.UNKNOWN).length,
    ok: results.filter((r) => r.status === STATUS.OK).length,
  };
}

/**
 * Evalúa un armado contra las reglas activas.
 * @param {Record<string, any>} [build] ranuras cpu, motherboard, ram, gpu, psu, pcCase, cooler, storage
 * @param {Record<string, unknown>} [rawParams] parámetros de consumo (valores por defecto si faltan)
 * @param {typeof defaultRules} [rules]
 */
export function evaluate(build = {}, rawParams, rules = defaultRules) {
  const params = resolveParams(rawParams);
  const results = rules
    .filter((rule) => rule.enabled !== false)
    .map((rule) => ({ ...rule.check(build, params), severity: rule.severity }));
  const watts = estimateWatts(build, params);
  return {
    results,
    summary: summarize(results),
    estimatedWatts: watts.total,
    recommendedPsuW: watts.recommended,
  };
}
