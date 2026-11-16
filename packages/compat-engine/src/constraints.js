import { evaluate } from './evaluate.js';
import { resolveParams } from './params.js';
import { estimateWatts } from './power.js';
import { STATUS } from './results.js';
import { hasText, isList, isNum, norm } from './util.js';

/** Ranura del armado que ocupa cada categoría (la caja se llama `pcCase`: `case` es palabra reservada). */
const SLOT_BY_CATEGORY = {
  cpu: 'cpu',
  motherboard: 'motherboard',
  ram: 'ram',
  gpu: 'gpu',
  psu: 'psu',
  case: 'pcCase',
  cooler: 'cooler',
  storage: 'storage',
};

/** @param {string} category */
export function slotForCategory(category) {
  const slot = SLOT_BY_CATEGORY[category];
  if (!slot) throw new Error(`Categoría desconocida: ${category}`);
  return slot;
}

/** Intersección de listas de valores normalizados; conserva el nombre original del primero. */
function intersect(lists) {
  const [first, ...rest] = lists;
  return first.filter((value) => rest.every((list) => list.some((v) => norm(v) === norm(value))));
}

/** Un solo valor se devuelve como texto; varios, como lista. */
const compact = (values) => (values.length === 1 ? values[0] : values);

/**
 * Restricciones que las piezas ya elegidas imponen a la siguiente (HU-06, Diseño Integral 5.5).
 * Los nombres de las claves son los mismos que usará GET /offers como filtros.
 * El filtro debe conservar las piezas con el dato desconocido (se muestran como "no verificable").
 *
 * | Categoría a elegir | Claves                                                                  |
 * |--------------------|-------------------------------------------------------------------------|
 * | motherboard        | socket, ram_type, form_factor (lista de formatos que admite la caja)    |
 * | cpu                | socket (de la placa y/o del disipador)                                  |
 * | ram                | ram_type (de la placa y/o de la CPU)                                    |
 * | cooler             | cooler_socket, max_height_mm                                            |
 * | gpu                | max_length_mm                                                           |
 * | case               | supports_form_factor, min_gpu_length_mm, min_cooler_height_mm           |
 * | psu                | min_wattage_w                                                           |
 *
 * @param {string} category categoría que el usuario va a elegir
 * @param {Record<string, any>} [build]
 * @param {Record<string, unknown>} [rawParams]
 * @returns {Record<string, string | string[] | number>}
 */
export function constraintsFor(category, build = {}, rawParams) {
  slotForCategory(category); // valida la categoría
  const params = resolveParams(rawParams);
  const { cpu, motherboard, ram, gpu, pcCase, cooler } = build;
  const out = {};

  switch (category) {
    case 'motherboard':
      if (hasText(cpu?.socket)) out.socket = cpu.socket;
      if (hasText(ram?.ramType)) out.ram_type = ram.ramType;
      if (isList(pcCase?.supportedMbFormFactors))
        out.form_factor = [...pcCase.supportedMbFormFactors];
      break;

    case 'cpu': {
      const sources = [];
      if (hasText(motherboard?.socket)) sources.push([motherboard.socket]);
      if (isList(cooler?.sockets)) sources.push(cooler.sockets);
      if (sources.length) out.socket = compact(intersect(sources));
      break;
    }

    case 'ram': {
      const sources = [];
      if (hasText(motherboard?.ramType)) sources.push([motherboard.ramType]);
      if (isList(cpu?.memoryTypes)) sources.push(cpu.memoryTypes);
      if (sources.length) out.ram_type = compact(intersect(sources));
      break;
    }

    case 'cooler':
      if (hasText(cpu?.socket)) out.cooler_socket = cpu.socket;
      if (isNum(pcCase?.maxCoolerHeightMm)) out.max_height_mm = pcCase.maxCoolerHeightMm;
      break;

    case 'gpu':
      if (isNum(pcCase?.maxGpuLengthMm)) out.max_length_mm = pcCase.maxGpuLengthMm;
      break;

    case 'case':
      if (hasText(motherboard?.formFactor)) out.supports_form_factor = motherboard.formFactor;
      if (isNum(gpu?.lengthMm)) out.min_gpu_length_mm = gpu.lengthMm;
      if (isNum(cooler?.heightMm)) out.min_cooler_height_mm = cooler.heightMm;
      break;

    case 'psu': {
      const { required } = estimateWatts(build, params);
      if (required > 0) out.min_wattage_w = Math.ceil(required);
      break;
    }

    default: // storage: sin restricciones en el MVP
      break;
  }
  return out;
}

/**
 * Evalúa cómo encaja una pieza candidata en el armado actual, mirando solo las reglas que la
 * involucran (los conflictos que ya existían entre otras piezas no la descartan).
 * Sirve para filtrar el selector "+ Elegir componente" en el navegador: se muestran las que
 * dan `ok` o `unknown` y se ocultan las `fail`.
 * @param {string} category
 * @param {Record<string, any>} specs especificaciones planas de la pieza candidata
 * @param {Record<string, any>} [build]
 * @returns {{ status: 'ok' | 'fail' | 'unknown', results: any[] }}
 */
export function evaluateCandidate(category, specs, build = {}, rawParams) {
  const slot = slotForCategory(category);
  const { results } = evaluate({ ...build, [slot]: specs }, rawParams);
  // Las reglas nombran las piezas por categoría ('case'), no por ranura ('pcCase'): comparar con
  // la ranura dejaba a toda caja candidata sin reglas y siempre daba "ok".
  const relevant = results.filter((result) => result.parts.includes(category));
  const status = relevant.some((r) => r.status === STATUS.FAIL)
    ? STATUS.FAIL
    : relevant.some((r) => r.status === STATUS.UNKNOWN)
      ? STATUS.UNKNOWN
      : STATUS.OK;
  return { status, results: relevant };
}
