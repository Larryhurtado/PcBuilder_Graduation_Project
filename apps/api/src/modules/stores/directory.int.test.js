// GET /stores contra la base real (comercios verificados del seed).
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('directorio de comercios contra PostgreSQL', () => {
  let pool;
  let app;

  beforeAll(() => {
    pool = createPool(url);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
  });
  afterAll(() => pool.end());

  it('lista solo comercios verificados, con ofertas, sin datos legales', async () => {
    const res = await request(app).get('/api/v1/stores');
    expect(res.status).toBe(200);
    const names = res.body.items.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(['TecnoPasarela Cali', 'Unilago Gaming']));
    // el pendiente, el que debe corregir y el suspendido del seed no aparecen
    for (const hidden of ['ComputoSur', 'HardwarePlus', 'ElectroNova']) {
      expect(names).not.toContain(hidden);
    }
    expect(res.body.items[0]).toEqual({
      id: expect.any(String),
      name: expect.any(String),
      description: expect.toBeOneOf([null, expect.any(String)]),
      logoUrl: null,
      department: expect.any(String),
      city: expect.any(String),
      commercialCenter: expect.toBeOneOf([null, expect.any(String)]),
      address: expect.any(String),
      whatsappE164: expect.stringMatching(/^\+57/),
      offersCount: expect.any(Number),
    });
    expect(JSON.stringify(res.body)).not.toMatch(/nit|legalName/i);
    // ordenados por cantidad de ofertas, de más a menos
    const counts = res.body.items.map((s) => s.offersCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it('el conteo de ofertas coincide con las visibles en el catálogo', async () => {
    const stores = (await request(app).get('/api/v1/stores')).body.items;
    const store = stores[0];
    const offers = await request(app).get(`/api/v1/offers?storeId=${store.id}&limit=50`);
    expect(offers.body.items).toHaveLength(store.offersCount);
  });

  it('filtra por texto y por ciudad, y respeta el límite', async () => {
    const byText = await request(app).get('/api/v1/stores?q=pasarela');
    expect(byText.body.items.map((s) => s.name)).toEqual(['TecnoPasarela Cali']);
    const byCity = await request(app).get('/api/v1/stores?city=cali');
    expect(byCity.body.items.every((s) => s.city.toLowerCase() === 'cali')).toBe(true);
    const limited = await request(app).get('/api/v1/stores?limit=1');
    expect(limited.body.items).toHaveLength(1);
    expect((await request(app).get('/api/v1/stores?q=zzzzzzzz')).body.items).toEqual([]);
  });

  it('los comodines del texto se tratan como texto, no como patrón', async () => {
    const res = await request(app).get('/api/v1/stores?q=%25%25');
    expect(res.body.items).toEqual([]);
  });

  describe('GET /stores/:id', () => {
    const idOf = async (tradeName) => {
      const { rows } = await pool.query('SELECT id FROM stores.stores WHERE trade_name = $1', [
        tradeName,
      ]);
      return rows[0].id;
    };

    it('un comercio verificado devuelve exactamente el mismo objeto que el listado (mismo offersCount)', async () => {
      const listed = (await request(app).get('/api/v1/stores')).body.items;
      for (const item of listed) {
        const res = await request(app).get(`/api/v1/stores/${item.id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(item);
      }
      expect(listed.length).toBeGreaterThan(0);
    });

    it('no expone la razón social ni el NIT', async () => {
      const id = await idOf('TecnoPasarela Cali');
      const { rows } = await pool.query('SELECT legal_name, nit FROM stores.stores WHERE id = $1', [
        id,
      ]);
      const res = await request(app).get(`/api/v1/stores/${id}`);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(rows[0].legal_name);
      expect(text).not.toContain(rows[0].nit);
      expect(Object.keys(res.body).sort()).toEqual(
        [
          'address',
          'city',
          'commercialCenter',
          'department',
          'description',
          'id',
          'logoUrl',
          'name',
          'offersCount',
          'whatsappE164',
        ].sort(),
      );
    });

    it('pendiente, con corrección solicitada, suspendido e inexistente dan el mismo 404', async () => {
      const ids = [
        await idOf('ComputoSur'), // pendiente de revisión
        await idOf('HardwarePlus'), // corrección solicitada
        await idOf('ElectroNova'), // suspendido
        '99999999-9999-4999-8999-999999999999', // no existe
      ];
      const responses = [];
      for (const id of ids) responses.push(await request(app).get(`/api/v1/stores/${id}`));
      for (const res of responses) {
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('STORE_NOT_FOUND');
        expect(res.body.message).toBe(responses[0].body.message);
        expect(res.body.details).toEqual(responses[0].body.details);
      }
    });

    it('un id mal formado da 422', async () => {
      const res = await request(app).get('/api/v1/stores/no-es-un-guid');
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  it('GET /offers?storeId= de un comercio sin verificar devuelve una lista vacía, no ofertas', async () => {
    // el comercio suspendido y el pendiente del seed no deben mostrar ofertas aunque las tuvieran
    const { rows } = await pool.query(
      `SELECT s.id, count(o.id)::int AS offers_in_db
         FROM stores.stores s LEFT JOIN offers.offers o ON o.store_id = s.id
        WHERE NOT s.is_verified GROUP BY s.id`,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const res = await request(app).get(`/api/v1/offers?storeId=${row.id}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    }
  });
});
