import { describe, expect, it, vi } from 'vitest';
import { createStoresRepository } from './repository.js';

const db = (rows = [{ id: 's1' }]) => ({ query: vi.fn(async () => ({ rows })) });

describe('stores repository', () => {
  it('insert usa ON CONFLICT para respetar un comercio por usuario y devuelve null si ya existía', async () => {
    const d = db([]);
    expect(
      await createStoresRepository(d).insert({
        ownerUserId: 'u1',
        legalName: 'A A',
        tradeName: 'B B',
      }),
    ).toBeNull();
    expect(d.query.mock.calls[0][0]).toContain('ON CONFLICT (owner_user_id) DO NOTHING');
    expect(d.query.mock.calls[0][1]).toEqual(['u1', 'A A', 'B B']);
  });

  it('update arma el SET solo con campos permitidos y todo como parámetros', async () => {
    const d = db();
    await createStoresRepository(d).update('s1', {
      city: 'Cali',
      whatsappE164: '+573001112233',
      isVerified: true, // no está permitido: se ignora
      'id = id; DROP TABLE x --': 'x',
    });
    const [sql, params] = d.query.mock.calls[0];
    // el orden de los campos lo fija la lista cerrada del repositorio, no el del cuerpo
    expect(sql).toContain('whatsapp_e164 = $2');
    expect(sql).toContain('city = $3');
    expect(sql).not.toContain('is_verified =');
    expect(sql).not.toContain('DROP');
    expect(params).toEqual(['s1', '+573001112233', 'Cali']);
  });

  it('openingHours se envía como JSON y se convierte a jsonb; null se queda null', async () => {
    const d = db();
    const repo = createStoresRepository(d);
    await repo.update('s1', { openingHours: { lun: '9-18' } });
    expect(d.query.mock.calls[0][0]).toContain('opening_hours = $2::jsonb');
    expect(d.query.mock.calls[0][1][1]).toBe('{"lun":"9-18"}');
    await repo.update('s1', { openingHours: null });
    expect(d.query.mock.calls[1][1][1]).toBeNull();
  });

  it('update sin campos válidos no escribe: relee el comercio', async () => {
    const d = db();
    await createStoresRepository(d).update('s1', { isVerified: true });
    expect(d.query.mock.calls[0][0]).toMatch(/^SELECT/);
  });
});
