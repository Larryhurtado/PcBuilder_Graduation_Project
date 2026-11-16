import { describe, expect, it } from 'vitest';
import { STATUS, fail, notApplicable, ok, unknown } from './index.js';

describe('resultados de una regla', () => {
  it('ok marca la regla como cumplida y lista las piezas', () => {
    expect(ok('RC-05', ['gpu', 'case'])).toEqual({
      code: 'RC-05',
      status: STATUS.OK,
      parts: ['gpu', 'case'],
      message: null,
    });
  });

  it('fail incluye el mensaje con las medidas', () => {
    const r = fail('RC-05', ['gpu', 'case'], 'La GPU mide 338 mm y la caja admite 330 mm');
    expect(r.status).toBe(STATUS.FAIL);
    expect(r.message).toContain('338 mm');
  });

  it('unknown no se confunde con ok', () => {
    const r = unknown('RC-06', ['cooler', 'case'], 'Falta la altura máxima del disipador');
    expect(r.status).toBe(STATUS.UNKNOWN);
    expect(r.status).not.toBe(STATUS.OK);
  });

  it('notApplicable no tiene piezas ni mensaje', () => {
    expect(notApplicable('RC-01')).toEqual({
      code: 'RC-01',
      status: STATUS.NOT_APPLICABLE,
      parts: [],
      message: null,
    });
  });
});
