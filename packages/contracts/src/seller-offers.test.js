import { describe, expect, it } from 'vitest';
import {
  analyticsSummaryQuerySchema,
  createOfferBodySchema,
  presignBodySchema,
  updateOfferBodySchema,
  visibilityBodySchema,
} from './index.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';
const base = { componentId: ID, priceCop: 1500000, condition: 'new' };

describe('createOfferBodySchema', () => {
  it('completa los valores por defecto', () => {
    expect(createOfferBodySchema.parse(base)).toEqual({
      ...base,
      warrantyMonths: 0,
      description: null,
      imageKeys: [],
    });
  });

  it('valida precio, garantía, descripción y fotos', () => {
    const bad = (patch) => createOfferBodySchema.safeParse({ ...base, ...patch }).success;
    expect(bad({ priceCop: 0 })).toBe(false);
    expect(bad({ priceCop: 12.5 })).toBe(false);
    expect(bad({ priceCop: 999_999_999_999 })).toBe(true);
    expect(bad({ priceCop: 1_000_000_000_000 })).toBe(false);
    expect(bad({ warrantyMonths: 120 })).toBe(true);
    expect(bad({ warrantyMonths: 121 })).toBe(false);
    expect(bad({ description: 'x'.repeat(1000) })).toBe(true);
    expect(bad({ description: 'x'.repeat(1001) })).toBe(false);
    expect(bad({ imageKeys: ['a', 'b', 'c', 'd', 'e'] })).toBe(true);
    expect(bad({ imageKeys: ['a', 'b', 'c', 'd', 'e', 'f'] })).toBe(false);
    expect(bad({ condition: 'refurbished' })).toBe(false);
    expect(bad({ storeId: ID })).toBe(false);
  });
});

describe('updateOfferBodySchema', () => {
  it('es parcial pero no vacío, y no deja cambiar producto ni estado', () => {
    expect(updateOfferBodySchema.safeParse({ priceCop: 5 }).success).toBe(true);
    expect(updateOfferBodySchema.safeParse({}).success).toBe(false);
    expect(updateOfferBodySchema.safeParse({ componentId: ID }).success).toBe(false);
    expect(updateOfferBodySchema.safeParse({ condition: 'used' }).success).toBe(false);
  });
});

describe('visibilityBodySchema, presignBodySchema y rango del panel', () => {
  it('visibilidad: solo active o paused', () => {
    expect(visibilityBodySchema.safeParse({ status: 'paused' }).success).toBe(true);
    expect(visibilityBodySchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('fotos: JPG o PNG de hasta 5 MB', () => {
    const ok = { fileName: 'a.jpg', mimeType: 'image/jpeg', sizeBytes: 5 * 1024 * 1024 };
    expect(presignBodySchema.safeParse(ok).success).toBe(true);
    expect(presignBodySchema.safeParse({ ...ok, sizeBytes: 5 * 1024 * 1024 + 1 }).success).toBe(
      false,
    );
    expect(presignBodySchema.safeParse({ ...ok, mimeType: 'image/webp' }).success).toBe(false);
  });

  it('rango: fechas AAAA-MM-DD, opcionales y en orden', () => {
    expect(analyticsSummaryQuerySchema.safeParse({}).success).toBe(true);
    expect(
      analyticsSummaryQuerySchema.safeParse({ from: '2026-11-01', to: '2026-11-16' }).success,
    ).toBe(true);
    expect(
      analyticsSummaryQuerySchema.safeParse({ from: '2026-11-16', to: '2026-11-01' }).success,
    ).toBe(false);
    expect(analyticsSummaryQuerySchema.safeParse({ from: '01/11/2026' }).success).toBe(false);
  });
});
