import { resolveParams } from './params.js';
import { isNum, round6 } from './util.js';

/**
 * Consumo estimado y fuente recomendada (HU-05, Diseño Integral 5.4):
 *   total       = TDP de la CPU + TDP de la GPU + consumo base del sistema
 *   required    = total × margen
 *   recommended = required redondeado hacia arriba al siguiente múltiplo del paso
 * Con un armado sin CPU ni GPU no hay nada que estimar: todo vale 0.
 * @param {Record<string, any>} [build]
 * @param {Record<string, unknown>} [rawParams]
 */
export function estimateWatts(build = {}, rawParams) {
  const params = resolveParams(rawParams);
  const cpuWatts = isNum(build.cpu?.tdpW) ? build.cpu.tdpW : 0;
  const gpuWatts = isNum(build.gpu?.tdpW) ? build.gpu.tdpW : 0;
  if (cpuWatts === 0 && gpuWatts === 0) return { total: 0, required: 0, recommended: 0 };

  const total = cpuWatts + gpuWatts + params.baseSystemWatts;
  const required = round6(total * params.psuHeadroomFactor);
  const recommended =
    Math.ceil(round6(required / params.psuRecommendedStep)) * params.psuRecommendedStep;
  return { total, required, recommended };
}
