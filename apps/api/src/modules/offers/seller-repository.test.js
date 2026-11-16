import { describe, expect, it, vi } from 'vitest';
import { createSellerOffersRepository } from './seller-repository.js';

/** Base falsa con transacción: `tx` registra las consultas igual que `db`. */
function fakeDb({ rowCount = 1, rows = [{ id: 'o1' }] } = {}) {
  const calls = [];
  const query = vi.fn(async (sql, params) => {
    calls.push({ sql, params });
    return { rows, rowCount };
  });
  return { query, calls, transaction: async (fn) => fn({ query }) };
}

describe('seller offers repository', () => {
  it('createWithImages inserta la oferta y las fotos con su posición, en una transacción', async () => {
    const db = fakeDb();
    const id = await createSellerOffersRepository(db).createWithImages({
      storeId: 's1',
      componentId: 'c1',
      priceCop: 100,
      condition: 'used',
      warrantyMonths: 3,
      description: null,
      imageKeys: ['offers/s1/a.jpg', 'offers/s1/b.png'],
    });
    expect(id).toBe('o1');
    const sqls = db.calls.map((c) => c.sql);
    expect(sqls[0]).toContain('INSERT INTO offers.offers');
    expect(db.calls[0].params).toEqual(['s1', 'c1', 100, 'used', 3, null]);
    expect(sqls[1]).toContain('DELETE FROM offers.offer_images');
    expect(db.calls[2].params).toEqual(['o1', 'offers/s1/a.jpg', 1]);
    expect(db.calls[3].params).toEqual(['o1', 'offers/s1/b.png', 2]);
  });

  it('updateWithImages solo toca campos permitidos y siempre actualiza updated_at', async () => {
    const db = fakeDb();
    const ok = await createSellerOffersRepository(db).updateWithImages('o1', 's1', {
      priceCop: 90,
      status: 'paused', // no permitido aquí: se ignora
      store_id: 'otra', // tampoco
    });
    expect(ok).toBe(true);
    const { sql, params } = db.calls[0];
    expect(sql).toContain('price_cop = $3');
    expect(sql).toContain('updated_at = now()');
    // lo que cambia es solo lo de antes del WHERE: ni estado ni comercio
    const setClause = sql.split('WHERE')[0];
    expect(setClause).not.toContain('status');
    expect(setClause).not.toContain('store_id');
    expect(params).toEqual(['o1', 's1', 90]);
    expect(db.calls).toHaveLength(1); // sin imageKeys no se tocan las fotos
  });

  it('updateWithImages reemplaza las fotos si vienen y devuelve false si la oferta no es del comercio', async () => {
    const db = fakeDb();
    await createSellerOffersRepository(db).updateWithImages('o1', 's1', {
      imageKeys: ['offers/s1/a.jpg'],
    });
    expect(db.calls.map((c) => c.sql.split(' ')[0])).toEqual(['UPDATE', 'DELETE', 'INSERT']);
    const missing = fakeDb({ rowCount: 0 });
    expect(
      await createSellerOffersRepository(missing).updateWithImages('x', 's1', { priceCop: 1 }),
    ).toBe(false);
    expect(missing.calls).toHaveLength(1);
  });

  it('setStatus y softDelete filtran por comercio y excluyen lo dado de baja', async () => {
    const db = fakeDb();
    const repo = createSellerOffersRepository(db);
    expect(await repo.setStatus('o1', 's1', 'paused')).toBe(true);
    expect(await repo.softDelete('o1', 's1')).toBe(true);
    for (const call of db.calls) {
      expect(call.sql).toContain('store_id = $2');
      expect(call.sql).toContain('deleted_at IS NULL');
    }
    expect(db.calls[1].sql).toContain('SET deleted_at = now()');
    expect(await createSellerOffersRepository(fakeDb({ rowCount: 0 })).softDelete('x', 's1')).toBe(
      false,
    );
  });

  it('listByStore y findOwned excluyen las ofertas dadas de baja', async () => {
    const db = fakeDb({ rows: [] });
    const repo = createSellerOffersRepository(db);
    await repo.listByStore('s1');
    expect(await repo.findOwned('o1', 's1')).toBeNull();
    expect(db.calls.every((c) => c.sql.includes('deleted_at IS NULL'))).toBe(true);
    expect(db.calls[0].sql).toContain('readmodel.component_summary');
  });

  it('countByStatus devuelve ceros para los estados sin ofertas', async () => {
    const db = fakeDb({ rows: [{ status: 'paused', total: 3 }] });
    expect(await createSellerOffersRepository(db).countByStatus('s1')).toEqual({
      active: 0,
      paused: 3,
    });
  });
});
