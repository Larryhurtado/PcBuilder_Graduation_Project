import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, createPool } from './db.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('acceso a la base de datos (PostgreSQL real)', () => {
  let pool;
  let db;
  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
  });
  afterAll(() => pool.end());

  it('devuelve columnas en camelCase y los precios como número', async () => {
    const { rows } = await db.query('SELECT price_cop, published_at FROM offers.offers LIMIT 1');
    expect(typeof rows[0].priceCop).toBe('number');
    expect(rows[0].publishedAt).toBeInstanceOf(Date);
  });

  it('los conteos (bigint) llegan como número', async () => {
    const { rows } = await db.query('SELECT count(*) AS total FROM catalog.components');
    expect(rows[0].total).toBe(28);
  });

  it('publicar con un comercio no verificado lanza 403 STORE_NOT_VERIFIED', async () => {
    const error = await db
      .query(
        `INSERT INTO offers.offers(store_id, component_id, price_cop, item_condition)
         SELECT s.id, c.id, 500000, 'new' FROM stores.stores s, catalog.components c
          WHERE s.trade_name = 'ComputoSur' LIMIT 1`,
      )
      .catch((e) => e);
    expect(error.code).toBe('STORE_NOT_VERIFIED');
    expect(error.status).toBe(403);
  });

  it('una segunda oferta viva del mismo producto lanza 409 OFFER_DUPLICATE', async () => {
    const error = await db
      .query(
        `INSERT INTO offers.offers(store_id, component_id, price_cop, item_condition)
         SELECT store_id, component_id, price_cop, item_condition
           FROM offers.offers WHERE deleted_at IS NULL LIMIT 1`,
      )
      .catch((e) => e);
    expect(error.code).toBe('OFFER_DUPLICATE');
    expect(error.status).toBe(409);
  });

  it('una transacción que falla se revierte por completo', async () => {
    await expect(
      db.transaction(async (tx) => {
        await tx.query('CREATE TABLE public.zz_tx_rollback (x int)');
        throw new Error('falla a propósito');
      }),
    ).rejects.toThrow('falla a propósito');
    const { rows } = await db.query("SELECT to_regclass('public.zz_tx_rollback') AS t");
    expect(rows[0].t).toBeNull();
  });

  it('una transacción exitosa se confirma', async () => {
    try {
      await db.transaction(async (tx) => {
        await tx.query('CREATE TABLE public.zz_tx_commit (x int)');
      });
      const { rows } = await db.query("SELECT to_regclass('public.zz_tx_commit') AS t");
      expect(rows[0].t).toBe('zz_tx_commit');
    } finally {
      await db.query('DROP TABLE IF EXISTS public.zz_tx_commit');
    }
  });
});
