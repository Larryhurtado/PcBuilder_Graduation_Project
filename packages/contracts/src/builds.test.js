import { describe, expect, it } from 'vitest';
import {
  buildItemsSchema,
  constraintsBodySchema,
  saveBuildBodySchema,
  shareCodeParamsSchema,
  validateBodySchema,
} from './index.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';
const cpu = { category: 'cpu', componentId: ID };

describe('compat: cuerpos', () => {
  it('buildItemsSchema: máximo una pieza por categoría y 8 en total', () => {
    expect(buildItemsSchema.safeParse([]).success).toBe(true);
    expect(buildItemsSchema.safeParse([cpu, { category: 'gpu', componentId: ID }]).success).toBe(
      true,
    );
    expect(buildItemsSchema.safeParse([cpu, cpu]).success).toBe(false);
    expect(buildItemsSchema.safeParse(Array.from({ length: 9 }, () => cpu)).success).toBe(false);
  });

  it('no aceptan especificaciones del cliente', () => {
    expect(validateBodySchema.safeParse({ items: [{ ...cpu, specs: {} }] }).success).toBe(false);
    expect(constraintsBodySchema.safeParse({ category: 'ram', items: [cpu] }).success).toBe(true);
    expect(constraintsBodySchema.safeParse({ items: [cpu] }).success).toBe(false);
  });
});

describe('saveBuildBodySchema', () => {
  it('completa nombre y draft por defecto', () => {
    expect(saveBuildBodySchema.parse({ items: [cpu] })).toEqual({
      name: 'Mi configuración',
      draft: false,
      items: [cpu],
    });
  });

  it('exige de 1 a 8 piezas, una por categoría, y no deja enviar precios', () => {
    expect(saveBuildBodySchema.safeParse({ items: [] }).success).toBe(false);
    expect(saveBuildBodySchema.safeParse({ items: [cpu, cpu] }).success).toBe(false);
    expect(saveBuildBodySchema.safeParse({ items: [{ ...cpu, unitPriceCop: 5 }] }).success).toBe(
      false,
    );
    expect(saveBuildBodySchema.safeParse({ items: [{ ...cpu, offerId: null }] }).success).toBe(
      true,
    );
    expect(saveBuildBodySchema.safeParse({ items: [cpu], name: 'x'.repeat(101) }).success).toBe(
      false,
    );
  });
});

describe('shareCodeParamsSchema', () => {
  it('son exactamente 10 letras o números', () => {
    expect(shareCodeParamsSchema.safeParse({ shareCode: 'Ab3dE9fG2h' }).success).toBe(true);
    for (const bad of ['', 'abc', 'Ab3dE9fG2', 'Ab3dE9fG2hh', 'Ab3dE9fG2-']) {
      expect(shareCodeParamsSchema.safeParse({ shareCode: bad }).success, bad).toBe(false);
    }
  });
});
