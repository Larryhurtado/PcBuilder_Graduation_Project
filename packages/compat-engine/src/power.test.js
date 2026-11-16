import { describe, expect, it } from 'vitest';
import { defaultParams, estimateWatts, resolveParams } from './index.js';
import * as f from './fixtures.js';

describe('estimateWatts', () => {
  it('suma TDP de CPU y GPU más 75 W y redondea la fuente a múltiplos de 50 W', () => {
    expect(estimateWatts({ cpu: f.cpuRyzen5_7600, gpu: f.gpuRtx4060Ti })).toEqual({
      total: 300,
      required: 375,
      recommended: 400,
    });
  });

  it('un armado sin CPU ni GPU consume 0 W', () => {
    expect(estimateWatts({})).toEqual({ total: 0, required: 0, recommended: 0 });
    expect(estimateWatts({ motherboard: f.mbB650mPro })).toEqual({
      total: 0,
      required: 0,
      recommended: 0,
    });
  });

  it('con solo CPU o solo GPU suma el consumo base', () => {
    expect(estimateWatts({ cpu: f.cpuRyzen5_7600 }).total).toBe(140);
    expect(estimateWatts({ gpu: f.gpuRx7600 }).total).toBe(240);
  });

  it('el múltiplo exacto no sube al siguiente (350 W necesarios → 350 W)', () => {
    // total 280 × 1,25 = 350 → exactamente 7 pasos de 50
    const cpu = { tdpW: 105 };
    const gpu = { tdpW: 100 };
    expect(estimateWatts({ cpu, gpu })).toEqual({ total: 280, required: 350, recommended: 350 });
  });

  it('un valor justo por encima sube al siguiente múltiplo', () => {
    expect(estimateWatts({ cpu: { tdpW: 106 }, gpu: { tdpW: 100 } }).recommended).toBe(400); // 351,25 → 400
  });

  it('ignora un TDP desconocido (null) en vez de propagar NaN', () => {
    expect(estimateWatts({ cpu: f.cpuRyzen5_7600, gpu: { tdpW: null } }).total).toBe(140);
  });

  it('respeta los parámetros recibidos', () => {
    const e = estimateWatts(
      { cpu: f.cpuRyzen5_7600, gpu: f.gpuRtx4060Ti },
      { psuHeadroomFactor: 1.5, psuRecommendedStep: 100 },
    );
    expect(e).toEqual({ total: 300, required: 450, recommended: 500 });
  });
});

describe('resolveParams', () => {
  it('sin argumentos devuelve los valores por defecto', () => {
    expect(resolveParams()).toEqual(defaultParams);
    expect(defaultParams).toEqual({
      baseSystemWatts: 75,
      psuHeadroomFactor: 1.25,
      psuRecommendedStep: 50,
    });
  });

  it('acepta los nombres de compat.params y convierte textos numéricos', () => {
    expect(resolveParams({ base_system_watts: '90', psu_headroom_factor: 1.3 })).toEqual({
      baseSystemWatts: 90,
      psuHeadroomFactor: 1.3,
      psuRecommendedStep: 50,
    });
  });

  it('ignora valores inválidos, no positivos y claves desconocidas', () => {
    expect(
      resolveParams({
        baseSystemWatts: 'abc',
        psuHeadroomFactor: 0,
        psuRecommendedStep: -5,
        otra: 1,
      }),
    ).toEqual(defaultParams);
  });

  it('los valores por defecto no se pueden modificar', () => {
    expect(Object.isFrozen(defaultParams)).toBe(true);
  });
});
