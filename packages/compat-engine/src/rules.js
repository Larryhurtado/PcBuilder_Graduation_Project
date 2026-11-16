import { resolveParams } from './params.js';
import { estimateWatts } from './power.js';
import { fail, notApplicable, ok, unknown } from './results.js';
import { hasText, includesNorm, isList, isNum, missing, same } from './util.js';

/**
 * Reglas de compatibilidad RC-01 a RC-08 (Diseño Integral, 5.3). Cada regla recibe el armado
 * (cada ranura con las especificaciones planas de la pieza) y devuelve un resultado:
 *   ok · fail · unknown (falta un dato: nunca se muestra como compatible) · not_applicable.
 * Prioridad cuando una regla tiene varias comprobaciones: fail > unknown > ok.
 */

/** RC-01: el socket de la CPU debe ser igual al de la placa base. */
export const rc01 = {
  code: 'RC-01',
  name: 'Socket CPU - placa base',
  severity: 'error',
  enabled: true,
  check({ cpu, motherboard }) {
    const parts = ['cpu', 'motherboard'];
    if (!cpu || !motherboard) return notApplicable('RC-01');
    if (!hasText(cpu.socket) || !hasText(motherboard.socket)) {
      return unknown(
        'RC-01',
        parts,
        missing(
          [!hasText(cpu.socket), 'el socket de la CPU'],
          [!hasText(motherboard.socket), 'el socket de la placa base'],
        ),
      );
    }
    return same(cpu.socket, motherboard.socket)
      ? ok('RC-01', parts)
      : fail(
          'RC-01',
          parts,
          `La CPU usa el socket ${cpu.socket} y la placa base es ${motherboard.socket}`,
        );
  },
};

/** RC-02: el tipo de RAM debe coincidir con el que soporta la placa base. */
export const rc02 = {
  code: 'RC-02',
  name: 'Tipo de RAM - placa base',
  severity: 'error',
  enabled: true,
  check({ ram, motherboard }) {
    const parts = ['ram', 'motherboard'];
    if (!ram || !motherboard) return notApplicable('RC-02');
    if (!hasText(ram.ramType) || !hasText(motherboard.ramType)) {
      return unknown(
        'RC-02',
        parts,
        missing(
          [!hasText(ram.ramType), 'el tipo de la memoria RAM'],
          [!hasText(motherboard.ramType), 'el tipo de RAM de la placa base'],
        ),
      );
    }
    return same(ram.ramType, motherboard.ramType)
      ? ok('RC-02', parts)
      : fail(
          'RC-02',
          parts,
          `La RAM es ${ram.ramType} y la placa base soporta ${motherboard.ramType}`,
        );
  },
};

/** RC-03: los módulos del kit no pueden superar las ranuras ni la capacidad máxima de la placa. */
export const rc03 = {
  code: 'RC-03',
  name: 'Capacidad y módulos de RAM',
  severity: 'error',
  enabled: true,
  check({ ram, motherboard }) {
    const parts = ['ram', 'motherboard'];
    if (!ram || !motherboard) return notApplicable('RC-03');

    const slotsKnown = isNum(ram.modulesQty) && isNum(motherboard.ramSlots);
    if (slotsKnown && ram.modulesQty > motherboard.ramSlots) {
      return fail(
        'RC-03',
        parts,
        `El kit tiene ${ram.modulesQty} módulos y la placa solo tiene ${motherboard.ramSlots} ranuras de RAM`,
      );
    }
    const capacityKnown = isNum(ram.capacityGb) && isNum(motherboard.ramMaxGb);
    if (capacityKnown && ram.capacityGb > motherboard.ramMaxGb) {
      return fail(
        'RC-03',
        parts,
        `El kit suma ${ram.capacityGb} GB y la placa admite hasta ${motherboard.ramMaxGb} GB`,
      );
    }
    if (!slotsKnown || !capacityKnown) {
      return unknown(
        'RC-03',
        parts,
        missing(
          [!isNum(ram.modulesQty), 'el número de módulos del kit'],
          [!isNum(ram.capacityGb), 'la capacidad del kit'],
          [!isNum(motherboard.ramSlots), 'las ranuras de RAM de la placa base'],
          [!isNum(motherboard.ramMaxGb), 'la capacidad máxima de RAM de la placa base'],
        ),
      );
    }
    return ok('RC-03', parts);
  },
};

/** RC-04: la caja debe soportar el factor de forma de la placa base. */
export const rc04 = {
  code: 'RC-04',
  name: 'Factor de forma placa - caja',
  severity: 'error',
  enabled: true,
  check({ motherboard, pcCase }) {
    const parts = ['motherboard', 'case'];
    if (!motherboard || !pcCase) return notApplicable('RC-04');
    if (!hasText(motherboard.formFactor) || !isList(pcCase.supportedMbFormFactors)) {
      return unknown(
        'RC-04',
        parts,
        missing(
          [!hasText(motherboard.formFactor), 'el formato de la placa base'],
          [!isList(pcCase.supportedMbFormFactors), 'los formatos de placa que admite la caja'],
        ),
      );
    }
    return includesNorm(pcCase.supportedMbFormFactors, motherboard.formFactor)
      ? ok('RC-04', parts)
      : fail(
          'RC-04',
          parts,
          `La placa base es ${motherboard.formFactor} y la caja solo admite ${pcCase.supportedMbFormFactors.join(', ')}`,
        );
  },
};

/** RC-05: la longitud de la GPU no puede superar el máximo de la caja. */
export const rc05 = {
  code: 'RC-05',
  name: 'Longitud GPU - caja',
  severity: 'error',
  enabled: true,
  check({ gpu, pcCase }) {
    const parts = ['gpu', 'case'];
    if (!gpu || !pcCase) return notApplicable('RC-05');
    if (!isNum(gpu.lengthMm) || !isNum(pcCase.maxGpuLengthMm)) {
      return unknown(
        'RC-05',
        parts,
        missing(
          [!isNum(gpu.lengthMm), 'la longitud de la GPU'],
          [!isNum(pcCase.maxGpuLengthMm), 'el límite de longitud de GPU de la caja'],
        ),
      );
    }
    return gpu.lengthMm <= pcCase.maxGpuLengthMm
      ? ok('RC-05', parts)
      : fail(
          'RC-05',
          parts,
          `La GPU mide ${gpu.lengthMm} mm y la caja admite ${pcCase.maxGpuLengthMm} mm`,
        );
  },
};

/** RC-06: la altura del disipador no puede superar el máximo de la caja. */
export const rc06 = {
  code: 'RC-06',
  name: 'Altura disipador - caja',
  severity: 'error',
  enabled: true,
  check({ cooler, pcCase }) {
    const parts = ['cooler', 'case'];
    if (!cooler || !pcCase) return notApplicable('RC-06');
    if (!isNum(cooler.heightMm) || !isNum(pcCase.maxCoolerHeightMm)) {
      return unknown(
        'RC-06',
        parts,
        missing(
          [!isNum(cooler.heightMm), 'la altura del disipador'],
          [!isNum(pcCase.maxCoolerHeightMm), 'la altura máxima de disipador de la caja'],
        ),
      );
    }
    return cooler.heightMm <= pcCase.maxCoolerHeightMm
      ? ok('RC-06', parts)
      : fail(
          'RC-06',
          parts,
          `El disipador mide ${cooler.heightMm} mm y la caja admite ${pcCase.maxCoolerHeightMm} mm`,
        );
  },
};

/** RC-07: el disipador debe declarar soporte para el socket de la CPU. */
export const rc07 = {
  code: 'RC-07',
  name: 'Socket disipador - CPU',
  severity: 'error',
  enabled: true,
  check({ cpu, cooler }) {
    const parts = ['cpu', 'cooler'];
    if (!cpu || !cooler) return notApplicable('RC-07');
    if (!hasText(cpu.socket) || !isList(cooler.sockets)) {
      return unknown(
        'RC-07',
        parts,
        missing(
          [!hasText(cpu.socket), 'el socket de la CPU'],
          [!isList(cooler.sockets), 'los sockets que soporta el disipador'],
        ),
      );
    }
    return includesNorm(cooler.sockets, cpu.socket)
      ? ok('RC-07', parts)
      : fail(
          'RC-07',
          parts,
          `La CPU usa el socket ${cpu.socket} y el disipador solo soporta ${cooler.sockets.join(', ')}`,
        );
  },
};

/** RC-08: la potencia de la fuente debe cubrir el consumo estimado con margen. */
export const rc08 = {
  code: 'RC-08',
  name: 'Potencia de la fuente',
  severity: 'error',
  enabled: true,
  check(build, rawParams) {
    const params = resolveParams(rawParams);
    const { cpu, gpu, psu } = build;
    if (!psu || !cpu) return notApplicable('RC-08');
    const parts = gpu ? ['psu', 'cpu', 'gpu'] : ['psu', 'cpu'];
    if (!isNum(psu.wattageW) || !isNum(cpu.tdpW) || (gpu && !isNum(gpu.tdpW))) {
      return unknown(
        'RC-08',
        parts,
        missing(
          [!isNum(psu.wattageW), 'la potencia de la fuente'],
          [!isNum(cpu.tdpW), 'el consumo (TDP) de la CPU'],
          [Boolean(gpu) && !isNum(gpu?.tdpW), 'el consumo (TDP) de la GPU'],
        ),
      );
    }
    const { total, required } = estimateWatts(build, params);
    const needed = Math.ceil(required);
    return psu.wattageW >= required
      ? ok('RC-08', parts)
      : fail(
          'RC-08',
          parts,
          `La fuente entrega ${psu.wattageW} W y se necesitan al menos ${needed} W (consumo estimado ${total} W × ${String(params.psuHeadroomFactor).replace('.', ',')})`,
        );
  },
};

/** Reglas del MVP, en orden. RC-09 a RC-12 son ampliaciones (no incluidas todavía). */
export const defaultRules = [rc01, rc02, rc03, rc04, rc05, rc06, rc07, rc08];
