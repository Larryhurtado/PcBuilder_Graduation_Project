import { describe, expect, it } from 'vitest';
import {
  componentCategories,
  componentCategorySchema,
  errorCodes,
  errorResponseSchema,
  isErrorCode,
} from './index.js';

describe('errorCodes', () => {
  it('cada código tiene un estado HTTP válido y un mensaje en español', () => {
    for (const [code, def] of Object.entries(errorCodes)) {
      expect(def.status, code).toBeGreaterThanOrEqual(400);
      expect(def.status, code).toBeLessThan(600);
      expect(def.message.length, code).toBeGreaterThan(0);
    }
  });

  it('STORE_NOT_VERIFIED usa el mensaje exacto de HU-27', () => {
    expect(errorCodes.STORE_NOT_VERIFIED.status).toBe(403);
    expect(errorCodes.STORE_NOT_VERIFIED.message).toBe(
      'Aún no puedes publicar productos hasta que tu negocio sea verificado.',
    );
  });

  it('isErrorCode reconoce solo códigos definidos', () => {
    expect(isErrorCode('OFFER_DUPLICATE')).toBe(true);
    expect(isErrorCode('NO_EXISTE')).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});

describe('errorResponseSchema', () => {
  it('acepta la forma { code, message, details, requestId }', () => {
    const body = { code: 'NOT_FOUND', message: 'x', details: null, requestId: 'abc' };
    expect(errorResponseSchema.safeParse(body).success).toBe(true);
  });

  it('rechaza una respuesta sin requestId', () => {
    expect(errorResponseSchema.safeParse({ code: 'X', message: 'x', details: null }).success).toBe(
      false,
    );
  });
});

describe('componentCategories', () => {
  it('son las 8 categorías del MVP', () => {
    expect(componentCategories).toHaveLength(8);
    expect(componentCategories).toContain('psu');
    expect(componentCategories).not.toContain('monitor');
  });

  it('el esquema acepta una categoría válida y rechaza otra', () => {
    expect(componentCategorySchema.safeParse('gpu').success).toBe(true);
    expect(componentCategorySchema.safeParse('monitor').success).toBe(false);
  });
});
