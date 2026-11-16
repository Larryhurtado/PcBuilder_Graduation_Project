import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from './cursor.js';

const row = {
  offerId: '6b03b443-7b22-491c-b301-7e2a285359df',
  priceCop: 849000,
  publishedAtRaw: '2026-11-10 15:04:05.123456+00',
};
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

describe('cursor de paginación', () => {
  it('ida y vuelta por precio', () => {
    const text = encodeCursor('price_asc', row);
    expect(decodeCursor(text, 'price_asc')).toEqual({ value: 849000, id: row.offerId });
  });

  it('para "newest" conserva la fecha con microsegundos como texto', () => {
    const text = encodeCursor('newest', row);
    expect(decodeCursor(text, 'newest')).toEqual({
      value: '2026-11-10 15:04:05.123456+00',
      id: row.offerId,
    });
  });

  it('es opaco y apto para URL', () => {
    expect(encodeCursor('price_asc', row)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('un cursor de otro orden se rechaza con VALIDATION_ERROR', () => {
    const text = encodeCursor('price_asc', row);
    expect(() => decodeCursor(text, 'newest')).toThrow('El cursor no es válido.');
    try {
      decodeCursor(text, 'newest');
    } catch (error) {
      expect(error.code).toBe('VALIDATION_ERROR');
    }
  });

  it.each([
    ['texto que no es base64 de JSON', '!!!no-es-cursor', 'price_asc'],
    ['JSON sin campos', b64({}), 'price_asc'],
    ['id que no es UUID', b64({ s: 'price_asc', v: 1, id: 'x' }), 'price_asc'],
    [
      'valor no numérico en orden por precio',
      b64({ s: 'price_asc', v: 'abc', id: row.offerId }),
      'price_asc',
    ],
    ['fecha inválida en "newest"', b64({ s: 'newest', v: 'ayer', id: row.offerId }), 'newest'],
  ])('rechaza: %s', (_name, text, sort) => {
    expect(() => decodeCursor(text, sort)).toThrow('El cursor no es válido.');
  });
});
