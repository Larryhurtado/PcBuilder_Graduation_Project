import { describe, expect, it, vi } from 'vitest';
import { AppError } from './errors.js';
import { camelizeRow, createDb, toCamel } from './db.js';

describe('toCamel / camelizeRow', () => {
  it('convierte snake_case a camelCase, incluidos los dígitos', () => {
    expect(toCamel('tdp_w')).toBe('tdpW');
    expect(toCamel('m2_slots')).toBe('m2Slots');
    expect(toCamel('base_clock_ghz')).toBe('baseClockGhz');
    expect(toCamel('id')).toBe('id');
  });

  it('solo convierte el primer nivel: el contenido de un jsonb no se toca', () => {
    const row = camelizeRow({ display_name: 'x', power_connectors: { pcie_8_pin: 2 } });
    expect(row).toEqual({ displayName: 'x', powerConnectors: { pcie_8_pin: 2 } });
  });
});

function fakePool({ failOn } = {}) {
  const client = {
    calls: [],
    released: undefined,
    async query(text) {
      client.calls.push(text);
      if (failOn && text.includes(failOn)) throw new Error('falla simulada');
      return { rows: [{ min_price_cop: 849000 }], rowCount: 1 };
    },
    release(discard) {
      client.released = discard;
    },
  };
  return {
    client,
    query: vi.fn(async () => ({ rows: [{ min_price_cop: 849000 }], rowCount: 1 })),
    connect: async () => client,
  };
}

describe('createDb.query', () => {
  it('devuelve las filas en camelCase y pasa los parámetros', async () => {
    const pool = fakePool();
    const db = createDb(pool);
    const result = await db.query('SELECT 1 WHERE $1', [7]);
    expect(result.rows).toEqual([{ minPriceCop: 849000 }]);
    expect(pool.query).toHaveBeenCalledWith('SELECT 1 WHERE $1', [7]);
  });

  it('traduce los errores de PostgreSQL a errores de negocio', async () => {
    const pool = {
      query: async () => {
        throw Object.assign(new Error('x'), { code: '23505', constraint: 'uq_offer_live' });
      },
    };
    const error = await createDb(pool)
      .query('INSERT …')
      .catch((e) => e);
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('OFFER_DUPLICATE');
  });
});

describe('createDb.transaction', () => {
  it('hace BEGIN, COMMIT y libera la conexión', async () => {
    const pool = fakePool();
    const result = await createDb(pool).transaction(async (tx) => {
      await tx.query('INSERT 1');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(pool.client.calls).toEqual(['BEGIN', 'INSERT 1', 'COMMIT']);
    expect(pool.client.released).toBe(false);
  });

  it('ante un error hace ROLLBACK, relanza el error y libera la conexión', async () => {
    const pool = fakePool();
    const boom = new Error('boom');
    await expect(
      createDb(pool).transaction(async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(pool.client.calls).toEqual(['BEGIN', 'ROLLBACK']);
    expect(pool.client.released).toBe(false);
  });

  it('si el ROLLBACK también falla, descarta la conexión', async () => {
    const pool = fakePool({ failOn: 'ROLLBACK' });
    await expect(
      createDb(pool).transaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(pool.client.released).toBe(true);
  });
});
