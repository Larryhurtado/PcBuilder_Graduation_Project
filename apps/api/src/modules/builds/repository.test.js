import { describe, expect, it, vi } from 'vitest';
import { createBuildsRepository } from './repository.js';

function fakeDb({ rows = [{ id: 'b1' }], rowCount = 1 } = {}) {
  const calls = [];
  const query = vi.fn(async (sql, params) => {
    calls.push({ sql, params });
    return { rows, rowCount };
  });
  return { query, calls, transaction: async (fn) => fn({ query }) };
}

const item = (category, extra = {}) => ({ category, componentId: `c-${category}`, ...extra });

describe('builds repository', () => {
  it('create inserta el armado y cada pieza en una transacción, con ranura 1', async () => {
    const db = fakeDb();
    const id = await createBuildsRepository(db).create({
      userId: null,
      name: 'Mi PC',
      shareCode: 'Ab3dE9fG2h',
      estimatedWatts: 300,
      items: [item('cpu', { offerId: 'o1', unitPriceCop: 100 }), item('gpu')],
    });
    expect(id).toBe('b1');
    expect(db.calls[0].sql).toContain('INSERT INTO builds.builds');
    expect(db.calls[0].params).toEqual([null, 'Mi PC', 'Ab3dE9fG2h', 300]);
    expect(db.calls[1].params).toEqual(['b1', 'cpu', 'c-cpu', 'o1', 100]);
    expect(db.calls[2].params).toEqual(['b1', 'gpu', 'c-gpu', null, null]);
    expect(db.calls[1].sql).toContain('::catalog.component_category');
  });

  it('replace solo actúa sobre armados del usuario y reemplaza las piezas', async () => {
    const db = fakeDb();
    expect(
      await createBuildsRepository(db).replace('b1', 'u1', {
        name: 'N',
        estimatedWatts: 1,
        items: [item('cpu')],
      }),
    ).toBe(true);
    expect(db.calls[0].sql).toContain('user_id = $2');
    expect(db.calls.map((c) => c.sql.split(' ')[0])).toEqual(['UPDATE', 'DELETE', 'INSERT']);

    const foreign = fakeDb({ rowCount: 0 });
    expect(
      await createBuildsRepository(foreign).replace('b1', 'otro', {
        name: 'N',
        estimatedWatts: 1,
        items: [item('cpu')],
      }),
    ).toBe(false);
    expect(foreign.calls).toHaveLength(1); // no toca las piezas de un armado ajeno
  });

  it('remove, findOwnedById y listByUser filtran por usuario', async () => {
    const db = fakeDb();
    const repo = createBuildsRepository(db);
    await repo.remove('b1', 'u1');
    await repo.findOwnedById('b1', 'u1');
    await repo.listByUser('u1');
    for (const call of db.calls) expect(call.sql).toMatch(/user_id = \$\d/);
    expect(db.calls[2].sql).toContain('ORDER BY b.updated_at DESC');
  });

  it('findByShareCode, findById y findItems devuelven la fila o null', async () => {
    const repo = createBuildsRepository(fakeDb({ rows: [] }));
    expect(await repo.findByShareCode('Zzzzzzzzzz')).toBeNull();
    expect(await repo.findById('x')).toBeNull();
    expect(await repo.findItems('x')).toEqual([]);
  });

  it('favoritos: alta idempotente, baja y lectura con precios del readmodel', async () => {
    const db = fakeDb();
    const repo = createBuildsRepository(db);
    await repo.addToWishlist('u1', 'c1');
    await repo.removeFromWishlist('u1', 'c1');
    await repo.listWishlist('u1');
    expect(db.calls[0].sql).toContain('ON CONFLICT (user_id, component_id) DO NOTHING');
    expect(db.calls[1].params).toEqual(['u1', 'c1']);
    expect(db.calls[2].sql).toContain('readmodel.best_price_by_component');
    expect(db.calls[2].sql).toContain('readmodel.component_summary');
  });
});
