import { describe, expect, it } from 'vitest';
import {
  convertBodySchema,
  updateStoreBodySchema,
  verificationStatusSchema,
  verificationStatusValues,
  whatsappE164Schema,
} from './index.js';

describe('whatsappE164Schema', () => {
  it('acepta celulares colombianos y rechaza el resto', () => {
    expect(whatsappE164Schema.safeParse('+573001234567').success).toBe(true);
    for (const bad of [
      '3001234567',
      '+572001234567',
      '+57300123456',
      '+14155550123',
      '+5730012345678',
    ]) {
      expect(whatsappE164Schema.safeParse(bad).success, bad).toBe(false);
    }
  });
});

describe('convertBodySchema', () => {
  it('recorta espacios y exige longitudes', () => {
    expect(convertBodySchema.parse({ legalName: '  Tecno SAS ', tradeName: ' Tecno ' })).toEqual({
      legalName: 'Tecno SAS',
      tradeName: 'Tecno',
    });
    expect(convertBodySchema.safeParse({ legalName: 'T', tradeName: 'Tecno' }).success).toBe(false);
    expect(
      convertBodySchema.safeParse({ legalName: 'Tecno SAS', tradeName: 'x'.repeat(121) }).success,
    ).toBe(false);
  });
});

describe('updateStoreBodySchema', () => {
  it('permite actualizar parcialmente, pero no vacío ni con campos ajenos', () => {
    expect(updateStoreBodySchema.safeParse({ city: 'Cali' }).success).toBe(true);
    expect(updateStoreBodySchema.safeParse({}).success).toBe(false);
    expect(updateStoreBodySchema.safeParse({ isVerified: true }).success).toBe(false);
  });

  it('los datos que exige la verificación no admiten null, los opcionales sí', () => {
    expect(updateStoreBodySchema.safeParse({ city: null }).success).toBe(false);
    expect(updateStoreBodySchema.safeParse({ whatsappE164: null }).success).toBe(false);
    expect(
      updateStoreBodySchema.safeParse({ description: null, commercialCenter: null }).success,
    ).toBe(true);
  });

  it('valida NIT, coordenadas y descripción', () => {
    expect(updateStoreBodySchema.safeParse({ nit: '900123456-7' }).success).toBe(true);
    expect(updateStoreBodySchema.safeParse({ nit: '900123456' }).success).toBe(false);
    expect(updateStoreBodySchema.safeParse({ latitude: 91 }).success).toBe(false);
    expect(updateStoreBodySchema.safeParse({ longitude: -181 }).success).toBe(false);
    expect(updateStoreBodySchema.safeParse({ description: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('verificationStatusSchema', () => {
  it('cubre los seis estados del Diseño Integral', () => {
    expect(verificationStatusValues).toHaveLength(6);
    expect(
      verificationStatusSchema.safeParse({
        status: 'approved',
        submittedAt: null,
        reviewerNote: null,
        deadlineAt: null,
        canReapplyAt: null,
      }).success,
    ).toBe(true);
  });
});
