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
});
