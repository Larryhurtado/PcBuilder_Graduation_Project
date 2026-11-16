import { describe, expect, it } from 'vitest';
import { STATUS, defaultParams, rc01, rc02, rc03, rc04, rc05, rc06, rc07, rc08 } from './index.js';
import * as f from './fixtures.js';

const run = (rule, build) => rule.check(build, defaultParams);

describe('RC-01 socket CPU - placa', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc01, { cpu: f.cpuRyzen5_7600, motherboard: f.mbB650mPro }).status).toBe(STATUS.OK);
    expect(run(rc01, { cpu: f.cpuRyzen5_5600, motherboard: f.mbB650mPro }).status).toBe(
      STATUS.FAIL,
    );
    expect(
      run(rc01, { cpu: { ...f.cpuRyzen5_7600, socket: null }, motherboard: f.mbB650mPro }).status,
    ).toBe(STATUS.UNKNOWN);
    expect(run(rc01, { cpu: f.cpuRyzen5_7600 }).status).toBe(STATUS.NOT_APPLICABLE);
  });

  it('compara sin distinguir mayúsculas, espacios ni guiones', () => {
    const r = run(rc01, {
      cpu: { ...f.cpuI5_12400f, socket: 'LGA1700' },
      motherboard: f.mbH610iMini,
    });
    expect(r.status).toBe(STATUS.OK);
  });
});

describe('RC-02 tipo de RAM - placa', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc02, { ram: f.ramDdr5_32, motherboard: f.mbB650mPro }).status).toBe(STATUS.OK);
    expect(run(rc02, { ram: f.ramDdr4_16, motherboard: f.mbB650mPro }).status).toBe(STATUS.FAIL);
    expect(
      run(rc02, { ram: { ...f.ramDdr5_32, ramType: '' }, motherboard: f.mbB650mPro }).status,
    ).toBe(STATUS.UNKNOWN);
    expect(run(rc02, { motherboard: f.mbB650mPro }).status).toBe(STATUS.NOT_APPLICABLE);
  });
});

describe('RC-03 módulos y capacidad de RAM', () => {
  it('ok cuando el kit cabe en ranuras y capacidad', () => {
    expect(run(rc03, { ram: f.ramDdr4_64, motherboard: f.mbH610iMini }).status).toBe(STATUS.OK); // 64 GB = máximo exacto
  });

  it('fail por demasiados módulos', () => {
    const r = run(rc03, { ram: { ...f.ramDdr4_16, modulesQty: 4 }, motherboard: f.mbH610iMini });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.message).toBe('El kit tiene 4 módulos y la placa solo tiene 2 ranuras de RAM');
  });

  it('fail por capacidad por encima del máximo', () => {
    const r = run(rc03, { ram: { ...f.ramDdr4_64, capacityGb: 128 }, motherboard: f.mbH610iMini });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.message).toBe('El kit suma 128 GB y la placa admite hasta 64 GB');
  });

  it('unknown si la placa no declara su capacidad máxima, pero fail si ya sobran módulos', () => {
    const noMax = { ...f.mbH610iMini, ramMaxGb: null };
    const unknownResult = run(rc03, { ram: f.ramDdr4_16, motherboard: noMax });
    expect(unknownResult.status).toBe(STATUS.UNKNOWN);
    expect(unknownResult.message).toBe('Falta la capacidad máxima de RAM de la placa base');
    expect(run(rc03, { ram: { ...f.ramDdr4_16, modulesQty: 4 }, motherboard: noMax }).status).toBe(
      STATUS.FAIL,
    );
  });

  it('no aplica sin placa', () => {
    expect(run(rc03, { ram: f.ramDdr4_16 }).status).toBe(STATUS.NOT_APPLICABLE);
  });
});

describe('RC-04 formato de placa - caja', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc04, { motherboard: f.mbB650mPro, pcCase: f.case4000d }).status).toBe(STATUS.OK);
    expect(run(rc04, { motherboard: f.mbB650mPro, pcCase: f.caseNr200p }).status).toBe(STATUS.FAIL);
    expect(
      run(rc04, {
        motherboard: f.mbB650mPro,
        pcCase: { ...f.case4000d, supportedMbFormFactors: [] },
      }).status,
    ).toBe(STATUS.UNKNOWN);
    expect(run(rc04, { pcCase: f.case4000d }).status).toBe(STATUS.NOT_APPLICABLE);
  });

  it('"Micro ATX" y "Micro-ATX" son el mismo formato', () => {
    const r = run(rc04, {
      motherboard: f.mbB650mPro,
      pcCase: { ...f.case4000d, supportedMbFormFactors: ['Micro-ATX'] },
    });
    expect(r.status).toBe(STATUS.OK);
  });
});

describe('RC-05 longitud de GPU - caja', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc05, { gpu: f.gpuRtx4060Ti, pcCase: f.case4000d }).status).toBe(STATUS.OK);
    expect(run(rc05, { gpu: f.gpuRtx4060Ti, pcCase: f.caseNr200p }).status).toBe(STATUS.FAIL);
    expect(
      run(rc05, { gpu: { ...f.gpuRtx4060Ti, lengthMm: null }, pcCase: f.case4000d }).status,
    ).toBe(STATUS.UNKNOWN);
    expect(run(rc05, { gpu: f.gpuRtx4060Ti }).status).toBe(STATUS.NOT_APPLICABLE);
  });

  it('el mensaje trae las medidas', () => {
    expect(run(rc05, { gpu: f.gpuRtx4060Ti, pcCase: f.caseNr200p }).message).toBe(
      'La GPU mide 338 mm y la caja admite 330 mm',
    );
  });

  it('una GPU que mide exactamente el máximo cabe', () => {
    expect(run(rc05, { gpu: { ...f.gpuRx7600, lengthMm: 330 }, pcCase: f.caseNr200p }).status).toBe(
      STATUS.OK,
    );
  });

  it('el mensaje de dato faltante nombra qué falta', () => {
    const r = run(rc05, {
      gpu: { ...f.gpuRtx4060Ti, lengthMm: null },
      pcCase: { ...f.case4000d, maxGpuLengthMm: null },
    });
    expect(r.message).toBe('Falta la longitud de la GPU y el límite de longitud de GPU de la caja');
  });
});

describe('RC-06 altura del disipador - caja', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc06, { cooler: f.coolerAk400, pcCase: f.case4000d }).status).toBe(STATUS.OK);
    expect(run(rc06, { cooler: f.coolerAk400, pcCase: f.caseNr200p }).status).toBe(STATUS.FAIL);
    expect(run(rc06, { cooler: f.coolerAk400, pcCase: f.caseH510Unknown }).status).toBe(
      STATUS.UNKNOWN,
    );
    expect(run(rc06, { cooler: f.coolerAk400 }).status).toBe(STATUS.NOT_APPLICABLE);
  });

  it('el mensaje trae las medidas', () => {
    expect(run(rc06, { cooler: f.coolerAk400, pcCase: f.caseNr200p }).message).toBe(
      'El disipador mide 155 mm y la caja admite 153 mm',
    );
  });
});

describe('RC-07 socket del disipador - CPU', () => {
  it('ok / fail / unknown / no aplica', () => {
    expect(run(rc07, { cpu: f.cpuRyzen5_7600, cooler: f.coolerAk400 }).status).toBe(STATUS.OK);
    const only4 = { ...f.coolerAk400, sockets: ['AM4'] };
    expect(run(rc07, { cpu: f.cpuRyzen5_7600, cooler: only4 }).status).toBe(STATUS.FAIL);
    expect(
      run(rc07, { cpu: f.cpuRyzen5_7600, cooler: { ...f.coolerAk400, sockets: [] } }).status,
    ).toBe(STATUS.UNKNOWN);
    expect(run(rc07, { cpu: f.cpuRyzen5_7600 }).status).toBe(STATUS.NOT_APPLICABLE);
  });

  it('el mensaje indica los sockets que soporta el disipador', () => {
    const r = run(rc07, { cpu: f.cpuRyzen5_7600, cooler: { ...f.coolerAk400, sockets: ['AM4'] } });
    expect(r.message).toBe('La CPU usa el socket AM5 y el disipador solo soporta AM4');
  });
});

describe('RC-08 potencia de la fuente', () => {
  const cpuGpu = { cpu: f.cpuRyzen7_7800x3d, gpu: f.gpuRtx4070Super }; // 120 + 220 + 75 = 415 W → 518,75 W

  it('ok con margen, fail sin margen', () => {
    expect(run(rc08, { ...cpuGpu, psu: f.psuCv650 }).status).toBe(STATUS.OK);
    const r = run(rc08, { ...cpuGpu, psu: { ...f.psuCv650, wattageW: 450 } });
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.message).toBe(
      'La fuente entrega 450 W y se necesitan al menos 519 W (consumo estimado 415 W × 1,25)',
    );
  });

  it('el límite es inclusivo: 375 W es suficiente para 300 W estimados y 374 W no', () => {
    const base = { cpu: f.cpuRyzen5_7600, gpu: f.gpuRtx4060Ti }; // 300 W → 375 W
    expect(run(rc08, { ...base, psu: { ...f.psuRm750, wattageW: 375 } }).status).toBe(STATUS.OK);
    expect(run(rc08, { ...base, psu: { ...f.psuRm750, wattageW: 374 } }).status).toBe(STATUS.FAIL);
  });

  it('sin GPU estima solo con la CPU (integrada) y lo indica en las piezas', () => {
    const r = run(rc08, { cpu: f.cpuRyzen5_7600, psu: f.psuRm750 });
    expect(r.status).toBe(STATUS.OK);
    expect(r.parts).toEqual(['psu', 'cpu']);
  });

  it('unknown si falta la potencia de la fuente; no aplica sin fuente o sin CPU', () => {
    expect(run(rc08, { ...cpuGpu, psu: { ...f.psuRm750, wattageW: null } }).status).toBe(
      STATUS.UNKNOWN,
    );
    expect(run(rc08, cpuGpu).status).toBe(STATUS.NOT_APPLICABLE);
    expect(run(rc08, { gpu: f.gpuRtx4070Super, psu: f.psuRm750 }).status).toBe(
      STATUS.NOT_APPLICABLE,
    );
  });

  it('usa los parámetros recibidos (margen de 1,5)', () => {
    const base = {
      cpu: f.cpuRyzen5_7600,
      gpu: f.gpuRtx4060Ti,
      psu: { ...f.psuRm750, wattageW: 400 },
    };
    expect(rc08.check(base, { psuHeadroomFactor: 1.5 }).status).toBe(STATUS.FAIL); // necesita 450 W
    expect(rc08.check(base, { psuHeadroomFactor: 1.25 }).status).toBe(STATUS.OK);
  });
});
