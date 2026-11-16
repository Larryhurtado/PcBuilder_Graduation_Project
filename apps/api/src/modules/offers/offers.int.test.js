// GET /offers contra los datos reales de la base (22 ofertas de demostración: 21 públicas,
// porque la RX 7600 de Unilago está pausada).
import {
  componentSchema,
  offerDetailSchema,
  offerListResponseSchema,
  specsSchemaByCategory,
} from '@hw/contracts';
import { constraintsFor } from '@hw/compat-engine';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { loadConfig } from '../../kernel/config.js';
import { createDb, createPool } from '../../kernel/db.js';

const url = process.env.DATABASE_URL;

describe.skipIf(!url)('ofertas contra PostgreSQL (datos semilla)', () => {
  let pool;
  let db;
  let app;

  beforeAll(() => {
    pool = createPool(url);
    db = createDb(pool);
    app = createApp({ config: loadConfig({ NODE_ENV: 'test' }), pool });
  });
  afterAll(() => pool.end());

  const get = (qs = '') => request(app).get(`/api/v1/offers${qs}`);

  /** Recorre todas las páginas y devuelve las ofertas. */
  async function fetchAll(qs) {
    const items = [];
    let cursor = null;
    for (let page = 0; page < 20; page += 1) {
      const res = await get(`?${qs}${cursor ? `&cursor=${cursor}` : ''}`);
      expect(res.status).toBe(200);
      expect(offerListResponseSchema.safeParse(res.body).success).toBe(true);
      items.push(...res.body.items);
      cursor = res.body.nextCursor;
      if (!cursor) return items;
    }
    throw new Error('demasiadas páginas');
  }

  it('lista solo ofertas públicas: 21 de las 22 (la pausada y las de tiendas sin verificar no salen)', async () => {
    const items = await fetchAll('limit=50');
    expect(items).toHaveLength(21);
    expect(items.some((i) => i.component.displayName.includes('RX 7600'))).toBe(false);
    expect(new Set(items.map((i) => i.store.name))).toEqual(
      new Set(['TecnoPasarela Cali', 'Unilago Gaming']),
    );
  });

  it('paginar de 5 en 5 recorre las 21 ofertas sin repetir ni saltar, con cualquier orden', async () => {
    for (const sort of ['price_asc', 'price_desc', 'newest']) {
      const items = await fetchAll(`limit=5&sort=${sort}`);
      const ids = items.map((i) => i.offerId);
      expect(ids, sort).toHaveLength(21);
      expect(new Set(ids).size, sort).toBe(21);
    }
  });

  it('el orden por precio es estrictamente el pedido', async () => {
    const asc = (await fetchAll('limit=7&sort=price_asc')).map((i) => i.priceCop);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const desc = (await fetchAll('limit=7&sort=price_desc')).map((i) => i.priceCop);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
    expect(asc[0]).toBe(99000); // el disipador AK400
  });

  it('"más recientes" no devuelve fechas fuera de orden', async () => {
    const dates = (await fetchAll('limit=6&sort=newest')).map((i) => Date.parse(i.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('filtros generales: categoría, condición, ciudad, rango de precio y texto', async () => {
    const gpus = await fetchAll('category=gpu');
    expect(gpus.map((i) => i.component.category)).toEqual(Array(gpus.length).fill('gpu'));
    expect(gpus).toHaveLength(2); // 4060 Ti y 4070 SUPER (la RX 7600 está pausada)

    const used = await fetchAll('condition=used');
    expect(used).toHaveLength(1);
    expect(used[0].condition).toBe('used');

    const cali = await fetchAll('city=cali');
    expect(cali).toHaveLength(10);
    expect(cali.every((i) => i.store.city === 'Cali')).toBe(true);

    const range = await fetchAll('minPrice=400000&maxPrice=600000');
    expect(range.length).toBeGreaterThan(0);
    expect(range.every((i) => i.priceCop >= 400000 && i.priceCop <= 600000)).toBe(true);

    const text = await fetchAll('q=ryzen');
    expect(text.every((i) => /ryzen/i.test(i.component.displayName))).toBe(true);
    expect(text.length).toBeGreaterThanOrEqual(4);
  });

  it('un filtro sin resultados devuelve una lista vacía y nextCursor null', async () => {
    const res = await get('?minPrice=900000000');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], nextCursor: null });
  });

  it('CP-06 de punta a punta: las restricciones del motor para la CPU Ryzen 5 7600 dejan solo placas AM5', async () => {
    const { rows } = await db.query(
      "SELECT id FROM catalog.components WHERE display_name = 'AMD Ryzen 5 7600'",
    );
    const cpu = (await request(app).get(`/api/v1/components/${rows[0].id}`)).body.specs;
    const filters = constraintsFor('motherboard', { cpu });
    expect(filters).toEqual({ socket: 'AM5' });

    const boards = await fetchAll(
      `category=motherboard&socket=${filters.socket}&includeSpecs=true`,
    );
    expect(boards.length).toBe(2); // B650M (Tecno) y B650 ATX (Unilago)
    expect(boards.every((b) => b.component.specs.socket === 'AM5')).toBe(true);

    const all = await fetchAll('category=motherboard');
    expect(all.length).toBeGreaterThan(boards.length); // el filtro realmente excluye (AM4 y LGA 1700)
  });

  it('el tipo de RAM y el formato de placa se comparan sin distinguir mayúsculas ni guiones', async () => {
    const ddr4 = await fetchAll('category=ram&ram_type=ddr4');
    expect(ddr4.length).toBeGreaterThan(0);
    const micro = await fetchAll('category=motherboard&form_factor=micro-atx');
    expect(micro.length).toBeGreaterThan(0);
    const withSpecs = await fetchAll(
      'category=motherboard&form_factor=MICRO%20ATX&includeSpecs=true',
    );
    expect(withSpecs.every((b) => b.component.specs.formFactor === 'Micro ATX')).toBe(true);
  });

  it('filtros de medidas: la GPU máxima de una caja y el disipador de una caja', async () => {
    const gpus = await fetchAll('category=gpu&max_length_mm=300&includeSpecs=true');
    expect(gpus.length).toBeGreaterThan(0);
    expect(
      gpus.every((g) => g.component.specs.lengthMm === null || g.component.specs.lengthMm <= 300),
    ).toBe(true);

    const cases = await fetchAll('category=case&min_gpu_length_mm=338&includeSpecs=true');
    expect(
      cases.every(
        (c) => c.component.specs.maxGpuLengthMm === null || c.component.specs.maxGpuLengthMm >= 338,
      ),
    ).toBe(true);
    const nr200p = cases.find((c) => c.component.displayName.includes('NR200P'));
    expect(nr200p).toBeUndefined(); // admite 330 mm: no entra una GPU de 338 mm
  });

  it('un dato desconocido no oculta la pieza: la caja sin altura de disipador sigue en la lista', async () => {
    const all = await fetchAll('category=case&includeSpecs=true');
    const unknown = all.filter((c) => c.component.specs.maxCoolerHeightMm === null);
    // Con una altura exigida, las cajas con el dato faltante se conservan (se mostrarán como "no verificable")
    const filtered = await fetchAll('category=case&min_cooler_height_mm=160&includeSpecs=true');
    for (const c of unknown) expect(filtered.map((f) => f.offerId)).toContain(c.offerId);
  });

  it('fuente: potencia mínima', async () => {
    const psus = await fetchAll('category=psu&min_wattage_w=700&includeSpecs=true');
    expect(psus.length).toBeGreaterThan(0);
    expect(psus.every((p) => p.component.specs.wattageW >= 700)).toBe(true);
  });

  it('includeSpecs agrega especificaciones que cumplen el contrato de su categoría', async () => {
    const items = await fetchAll('includeSpecs=true&limit=50');
    for (const item of items) {
      const parsed = specsSchemaByCategory[item.component.category].safeParse(item.component.specs);
      expect(parsed.success, `${item.component.displayName}: ${parsed.error?.message}`).toBe(true);
    }
    const plain = await get('?limit=1');
    expect(plain.body.items[0].component).not.toHaveProperty('specs');
  });

  it('un cursor alterado o de otro orden responde 422', async () => {
    expect((await get('?cursor=basura')).status).toBe(422);
    const first = await get('?limit=1&sort=price_asc');
    expect((await get(`?sort=newest&cursor=${first.body.nextCursor}`)).status).toBe(422);
  });

  it('GET /offers/featured devuelve las más recientes', async () => {
    const res = await request(app).get('/api/v1/offers/featured?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    const dates = res.body.items.map((i) => Date.parse(i.publishedAt));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('GET /offers/:id devuelve el detalle con la dirección del local', async () => {
    const list = await get('?q=ryzen 5 7600&sort=price_asc');
    const cheapest = list.body.items[0];
    expect(cheapest.priceCop).toBe(849000); // el ajuste de precio de la semilla

    const res = await request(app).get(`/api/v1/offers/${cheapest.offerId}`);
    expect(res.status).toBe(200);
    expect(offerDetailSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.description).toBe('Procesador AM5 nuevo, sellado.');
    expect(res.body.store.address).toBe('Local 214, C.C. Pasarela');
    expect(res.body.store.latitude).toBeCloseTo(3.4516, 3);
  });

  it('una oferta pausada, o de un comercio sin verificar, responde 404', async () => {
    const { rows: paused } = await db.query("SELECT id FROM offers.offers WHERE status = 'paused'");
    expect(paused.length).toBeGreaterThan(0);
    const res = await request(app).get(`/api/v1/offers/${paused[0].id}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('La oferta no está disponible.');
    expect(
      (await request(app).get('/api/v1/offers/99999999-9999-4999-8999-999999999999')).status,
    ).toBe(404);
  });

  it('la ficha técnica del catálogo sigue cumpliendo su contrato tras la migración 006', async () => {
    const { rows } = await db.query('SELECT id FROM catalog.components LIMIT 1');
    const res = await request(app).get(`/api/v1/components/${rows[0].id}`);
    expect(componentSchema.safeParse(res.body).success).toBe(true);
  });
});
