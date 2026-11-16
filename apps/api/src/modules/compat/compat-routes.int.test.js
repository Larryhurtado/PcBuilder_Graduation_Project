// POST /compat/validate y /compat/constraints contra la base real, con los armados de ejemplo del seed.
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('rutas de compatibilidad contra PostgreSQL', () => {
  let pool;
  let db;
  let app;

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
  });
  afterAll(() => pool.end());

  async function itemsOf(shareCode) {
    const { rows } = await db.query(
      `SELECT bi.category::text AS category, bi.component_id AS "componentId"
         FROM builds.builds b JOIN builds.build_items bi ON bi.build_id = b.id
        WHERE b.share_code = $1 ORDER BY bi.category`,
      [shareCode],
    );
    return rows.map((r) => ({ category: r.category, componentId: r.componentId }));
  }
  const validate = (items) => request(app).post('/api/v1/compat/validate').send({ items });

  it('armado A: todo compatible, 300 W y fuente de 400 W', async () => {
    const items = await itemsOf('Ab3dE9fG2h');
    const res = await validate(items);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r) => r.status)).toEqual(Array(8).fill('ok'));
    expect(res.body.estimatedWatts).toBe(300);
    expect(res.body.recommendedPsuW).toBe(400);
    expect(res.body.items).toHaveLength(8);
    expect(res.body.items[0]).toEqual({
      category: expect.any(String),
      componentId: expect.any(String),
      brand: expect.any(String),
      model: expect.any(String),
      displayName: expect.any(String),
    });
  });

  it('armado B: incompatible en RC-01, RC-02 y RC-04, como en la base', async () => {
    const res = await validate(await itemsOf('Zx8Qw1Er5T'));
    const failed = res.body.results.filter((r) => r.status === 'fail').map((r) => r.code);
    expect(failed).toEqual(['RC-01', 'RC-02', 'RC-04']);
    expect(res.body.summary.incompatible).toBe(3);
  });

  it('un componente inexistente da 404 y uno en la categoría equivocada 422', async () => {
    const ghost = await validate([
      { category: 'cpu', componentId: '99999999-9999-4999-8999-999999999999' },
    ]);
    expect(ghost.status).toBe(404);
    expect(ghost.body.code).toBe('COMPONENT_NOT_FOUND');

    const [cpu] = (await itemsOf('Ab3dE9fG2h')).filter((i) => i.category === 'cpu');
    const wrong = await validate([{ category: 'gpu', componentId: cpu.componentId }]);
    expect(wrong.status).toBe(422);
  });

  it('constraints: la placa del armado A impone su socket y su tipo de RAM al elegir CPU y RAM', async () => {
    const items = (await itemsOf('Ab3dE9fG2h')).filter((i) => i.category === 'motherboard');
    const cpu = await request(app)
      .post('/api/v1/compat/constraints')
      .send({ category: 'cpu', items });
    expect(cpu.body.constraints).toEqual({ socket: expect.any(String) });
    const ram = await request(app)
      .post('/api/v1/compat/constraints')
      .send({ category: 'ram', items });
    expect(ram.body.constraints).toEqual({ ram_type: expect.any(String) });
  });
});
