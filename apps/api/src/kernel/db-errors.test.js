import { describe, expect, it } from 'vitest';
import { translateDbError } from './db-errors.js';
import { AppError } from './errors.js';

const pgError = (code, extra = {}) =>
  Object.assign(new Error(extra.message ?? 'pg'), { code, ...extra });

describe('translateDbError', () => {
  it('el disparador de tienda no verificada pasa a 403 STORE_NOT_VERIFIED', () => {
    const error = translateDbError(
      pgError('23514', { message: 'STORE_NOT_VERIFIED: el comercio x no está verificado' }),
    );
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('STORE_NOT_VERIFIED');
    expect(error.status).toBe(403);
  });

  it('la oferta duplicada pasa a 409 OFFER_DUPLICATE', () => {
    const error = translateDbError(pgError('23505', { constraint: 'uq_offer_live' }));
    expect(error.code).toBe('OFFER_DUPLICATE');
    expect(error.status).toBe(409);
  });

  it('otra violación de UNIQUE pasa a 409 con el nombre de la restricción', () => {
    const error = translateDbError(pgError('23505', { constraint: 'users_email_key' }));
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ constraint: 'users_email_key' });
  });

  it('una clave foránea de componente pasa a 404 COMPONENT_NOT_FOUND', () => {
    const error = translateDbError(pgError('23503', { constraint: 'offers_component_id_fkey' }));
    expect(error.code).toBe('COMPONENT_NOT_FOUND');
    expect(error.status).toBe(404);
  });

  it.each(['23503', '23502', '23514', '22P02', '22003', '22001'])(
    'el código %s pasa a VALIDATION_ERROR',
    (code) => {
      expect(translateDbError(pgError(code)).code).toBe('VALIDATION_ERROR');
    },
  );

  it('no toca errores desconocidos ni de conexión', () => {
    const refused = Object.assign(new Error('rechazada'), { code: 'ECONNREFUSED' });
    expect(translateDbError(refused)).toBe(refused);
    const plain = new Error('otro');
    expect(translateDbError(plain)).toBe(plain);
  });

  it('un AppError que ya está traducido se devuelve igual', () => {
    const app = new AppError('NOT_FOUND');
    expect(translateDbError(app)).toBe(app);
  });
});
