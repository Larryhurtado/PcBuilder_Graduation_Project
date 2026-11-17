import { describe, expect, it } from 'vitest';
import {
  deltaVsAverage,
  emptyDraft,
  formatBytes,
  parseWarranty,
  photoProblem,
  priceReference,
  progressPercent,
  STEPS,
  stepErrors,
  toOfferBody,
} from './publish.js';

const file = (type, size) => ({ type, size, name: 'f' });

describe('progressPercent', () => {
  it('va de 0 a 100 según el paso', () => {
    expect(STEPS).toHaveLength(4);
    expect([0, 1, 2, 3].map(progressPercent)).toEqual([0, 33, 67, 100]);
  });
});

describe('parseWarranty', () => {
  it.each([
    ['0', 0],
    ['12', 12],
    [' 120 ', 120],
  ])('acepta "%s"', (text, value) => expect(parseWarranty(text)).toBe(value));

  it.each(['', 'abc', '-1', '1.5', '121'])('rechaza "%s"', (text) =>
    expect(parseWarranty(text)).toBeNull(),
  );
});

describe('stepErrors', () => {
  it('el paso 1 pide categoría, luego marca y luego modelo', () => {
    expect(stepErrors(0, emptyDraft)).toEqual({ category: expect.any(String) });
    expect(stepErrors(0, { ...emptyDraft, category: 'cpu' })).toEqual({
      brand: expect.any(String),
    });
    expect(stepErrors(0, { ...emptyDraft, category: 'cpu', brandId: '1' })).toEqual({
      model: expect.any(String),
    });
    expect(
      stepErrors(0, { ...emptyDraft, category: 'cpu', brandId: '1', componentId: 'x' }),
    ).toEqual({});
  });

  it('el paso 2 valida precio, garantía y notas', () => {
    expect(stepErrors(1, { ...emptyDraft, price: '849.000' })).toEqual({});
    expect(Object.keys(stepErrors(1, { ...emptyDraft, price: '0', warranty: '200' }))).toEqual([
      'price',
      'warranty',
    ]);
    expect(stepErrors(1, { ...emptyDraft, price: '1000', notes: 'x'.repeat(1001) })).toEqual({
      notes: expect.any(String),
    });
  });

  it('los pasos de fotos y resumen no exigen nada', () => {
    expect(stepErrors(2, emptyDraft)).toEqual({});
    expect(stepErrors(3, emptyDraft)).toEqual({});
  });
});

describe('toOfferBody', () => {
  it('convierte el borrador al cuerpo de la API', () => {
    expect(
      toOfferBody({
        ...emptyDraft,
        componentId: 'c1',
        price: '1.849.000',
        warranty: '24',
        notes: ' Hola ',
      }),
    ).toEqual({
      componentId: 'c1',
      priceCop: 1_849_000,
      condition: 'new',
      warrantyMonths: 24,
      description: 'Hola',
    });
  });

  it('sin notas envía null', () => {
    expect(toOfferBody({ ...emptyDraft, price: '5', notes: '   ' }).description).toBeNull();
  });
});

describe('priceReference', () => {
  it('con menos de 2 ofertas no hay referencia', () => {
    expect(priceReference([])).toBeNull();
    expect(priceReference([{ priceCop: 100 }])).toBeNull();
  });

  it('calcula mínimo, promedio y máximo', () => {
    expect(priceReference([{ priceCop: 100 }, { priceCop: 300 }, { priceCop: 200 }])).toEqual({
      count: 3,
      min: 100,
      max: 300,
      average: 200,
    });
  });
});

describe('deltaVsAverage', () => {
  it('da el porcentaje contra el promedio con un decimal', () => {
    expect(deltaVsAverage(980, 1000)).toBe(-2);
    expect(deltaVsAverage(1100, 1000)).toBe(10);
    expect(deltaVsAverage(1000, 1000)).toBe(0);
    expect(deltaVsAverage(1849, 1890)).toBe(-2.2);
  });
});

describe('photoProblem', () => {
  it('acepta JPG y PNG de hasta 5 MB', () => {
    expect(photoProblem(file('image/jpeg', 1000))).toBeNull();
    expect(photoProblem(file('image/png', 5 * 1024 * 1024))).toBeNull();
  });

  it('rechaza otros formatos, archivos grandes y vacíos', () => {
    expect(photoProblem(file('image/webp', 1000))).toMatch(/JPG o PNG/);
    expect(photoProblem(file('application/pdf', 1000))).toMatch(/JPG o PNG/);
    expect(photoProblem(file('image/png', 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
    expect(photoProblem(file('image/png', 0))).toMatch(/vacío/);
  });
});

describe('formatBytes', () => {
  it('muestra KB o MB', () => {
    expect(formatBytes(500)).toBe('1 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2.4 * 1024 * 1024)).toBe('2,4 MB');
  });
});
