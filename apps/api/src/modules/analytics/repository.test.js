import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsRepository } from './repository.js';

const input = {
  offerId: '6b03b443-7b22-491c-b301-7e2a285359df',
  storeId: '11111111-1111-4111-8111-111111111111',
  type: 'view',
  sessionHash: 'a'.repeat(64),
  windowSeconds: 1800,
};

describe('analytics repository', () => {
  it('insertEvent descarta repetidos con NOT EXISTS y pasa todo como parámetros', async () => {
    const db = { query: vi.fn(async () => ({ rowCount: 1 })) };
    const inserted = await createAnalyticsRepository(db).insertEvent(input);
    expect(inserted).toBe(true);
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain('make_interval(secs => $5::double precision)');
    expect(params).toEqual([input.offerId, input.storeId, 'view', input.sessionHash, 1800]);
  });

  it('devuelve false cuando no se insertó ninguna fila (evento repetido)', async () => {
    const db = { query: vi.fn(async () => ({ rowCount: 0 })) };
    expect(await createAnalyticsRepository(db).insertEvent(input)).toBe(false);
  });

  it('ensureMonthPartition llama a la función de la base con la fecha', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await createAnalyticsRepository(db).ensureMonthPartition('2026-11-01');
    expect(db.query).toHaveBeenCalledWith('SELECT analytics.ensure_month_partition($1::date)', [
      '2026-11-01',
    ]);
  });
});
