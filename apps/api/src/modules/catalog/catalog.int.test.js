import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { componentCategories, componentSchema, componentSearchResponseSchema } from '@hw/contracts';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';
import { createCatalogModule } from './index.js';

const url = process.env.DATABASE_URL;
const json = (value) => JSON.parse(JSON.stringify(value));

describe.skipIf(!url)('catálogo contra PostgreSQL (datos semilla)', () => {
  let pool;
  let db;
  let catalog;
  let app;

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    catalog = createCatalogModule({ db });
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
  });
  afterAll(() => pool.end());

  it('los 28 componentes de la semilla cumplen el contrato componentSchema', async () => {
    const { rows } = await db.query('SELECT id FROM catalog.components');
    expect(rows).toHaveLength(28);

    const components = await catalog.facade.getSpecs(rows.map((r) => r.id));
    expect(components.size).toBe(28);

    for (const component of components.values()) {
      const parsed = componentSchema.safeParse(json(component));
      expect(parsed.success, `${component.displayName}: ${parsed.error?.message}`).toBe(true);
    }
    const categories = new Set([...components.values()].map((c) => c.category));
    expect([...categories].sort()).toEqual([...componentCategories].sort());
  });

  it('la ficha del Ryzen 5 7600 trae socket AM5, 65 W y la atribución de BuildCores', async () => {
    const { rows } = await db.query(
      "SELECT id FROM catalog.components WHERE display_name = 'AMD Ryzen 5 7600'",
    );
    const cpu = await catalog.facade.getComponent(rows[0].id);
    expect(cpu.specs).toMatchObject({ socket: 'AM5', tdpW: 65, memoryTypes: ['DDR5'] });
    expect(cpu.source.license).toBe('CC BY-NC-SA 4.0');
  });

  it('los disipadores traen sus sockets y las cajas sus formatos', async () => {
    const { rows } = await db.query(
      "SELECT id, category FROM catalog.components WHERE category IN ('cooler', 'case')",
    );
    const components = await catalog.facade.getSpecs(rows.map((r) => r.id));
    for (const c of components.values()) {
      if (c.category === 'cooler') expect(c.specs.sockets.length).toBeGreaterThan(0);
      else expect(c.specs.supportedMbFormFactors.length).toBeGreaterThan(0);
    }
  });

  it('el buscador encuentra el Ryzen 5 7600 con su precio mínimo y número de ofertas', async () => {
    const res = await request(app).get('/api/v1/catalog/search?q=ryzen 5 7600');
    expect(res.status).toBe(200);
    expect(componentSearchResponseSchema.safeParse(res.body).success).toBe(true);
    const cpu = res.body.items.find((i) => i.displayName === 'AMD Ryzen 5 7600');
    expect(cpu).toMatchObject({ minPriceCop: 849000, offersCount: 2 });
  });

  it('el buscador tolera textos parciales y no falla con comodines', async () => {
    const partial = await request(app).get('/api/v1/catalog/search?q=rtx 40');
    expect(partial.body.items.some((i) => i.displayName.includes('RTX 40'))).toBe(true);
    const wildcard = await request(app).get('/api/v1/catalog/search?q=%25%25');
    expect(wildcard.status).toBe(200);
    expect(wildcard.body.items).toEqual([]);
  });

  it('GET /components/:id responde 200 con un componente válido', async () => {
    const { rows } = await db.query(
      "SELECT id FROM catalog.components WHERE category = 'gpu' LIMIT 1",
    );
    const res = await request(app).get(`/api/v1/components/${rows[0].id}`);
    expect(res.status).toBe(200);
    expect(componentSchema.safeParse(res.body).success).toBe(true);
  });

  it('un id inexistente responde 404 y uno mal formado responde 422', async () => {
    const missing = await request(app).get(
      '/api/v1/components/99999999-9999-4999-8999-999999999999',
    );
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('COMPONENT_NOT_FOUND');
    const invalid = await request(app).get('/api/v1/components/abc');
    expect(invalid.status).toBe(422);
  });
});
