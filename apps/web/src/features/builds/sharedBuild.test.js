import { describe, expect, it } from 'vitest';
import { gpuClearance, isShareCode, sharedRows } from './sharedBuild.js';

const part = (specs, offerId = 'o') => ({ offerId, component: { specs } });

describe('isShareCode', () => {
  it('acepta 10 letras y números', () => {
    expect(isShareCode('GAMEam5Set')).toBe(true);
    expect(isShareCode('0123456789')).toBe(true);
  });

  it.each(['', 'corto', 'GAMEam5Set1', 'GAME-am5Se', 'GAMEam5 Set', null, undefined])(
    'rechaza %j',
    (code) => expect(isShareCode(code)).toBe(false),
  );
});

describe('gpuClearance', () => {
  it('es el largo máximo de la caja menos el de la tarjeta', () => {
    expect(
      gpuClearance({
        case: part({ maxGpuLengthMm: 345 }),
        gpu: part({ lengthMm: 300 }),
      }),
    ).toBe(45);
  });

  it('puede ser negativa cuando no cabe', () => {
    expect(
      gpuClearance({ case: part({ maxGpuLengthMm: 280 }), gpu: part({ lengthMm: 300 }) }),
    ).toBe(-20);
  });

  it('sin una pieza o sin un dato es null, nunca cero', () => {
    expect(gpuClearance({})).toBeNull();
    expect(gpuClearance({ gpu: part({ lengthMm: 300 }) })).toBeNull();
    expect(
      gpuClearance({ case: part({ maxGpuLengthMm: null }), gpu: part({ lengthMm: 300 }) }),
    ).toBeNull();
  });
});

describe('sharedRows', () => {
  const items = [
    { category: 'gpu', offerId: 'g1' },
    { category: 'cpu', offerId: 'c1' },
    { category: 'psu', offerId: null },
  ];

  it('va en el orden de las ranuras y solo con las piezas guardadas', () => {
    const rows = sharedRows(items, {});
    expect(rows.map((row) => row.slot.category)).toEqual(['cpu', 'gpu', 'psu']);
  });

  it('una pieza sin oferta vigente queda con offer null', () => {
    const rows = sharedRows(items, { cpu: { offerId: 'c1' } });
    expect(rows.find((row) => row.slot.category === 'gpu').offer).toBeNull();
    expect(rows.find((row) => row.slot.category === 'cpu').offer).toEqual({ offerId: 'c1' });
  });

  it('marca como reemplazada la oferta que ya no es la guardada', () => {
    const rows = sharedRows(items, {
      cpu: { offerId: 'c1' },
      gpu: { offerId: 'otra' },
      psu: { offerId: 'cualquiera' },
    });
    expect(rows.map((row) => row.replaced)).toEqual([false, true, false]);
  });
});
